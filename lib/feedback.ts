// Feedback data layer: thread-based tickets, atomic reference numbers, the state
// machine transitions, and ANONYMITY enforcement (the API never returns parent
// identity for anonymous tickets — for the detail view we don't even fetch it).
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseAttachments } from "@/lib/homework-format";
import {
  canPrincipalReply,
  canClose,
  parentReplyResult,
  type FeedbackStatus,
} from "@/lib/feedback-state";
import type { StoredFile } from "@/lib/upload-constants";
import type { FeedbackCreateInput, FeedbackReplyInput } from "@/lib/validations/feedback";

export class FeedbackError extends Error {
  constructor(public code: "NOT_FOUND" | "ILLEGAL_TRANSITION", message: string) {
    super(message);
  }
}

// ATOMIC REFERENCE NUMBERS. The Counter row for (school, year) is incremented
// with a single `update value = value + 1` — an atomic DB operation. Two parents
// submitting at the same instant get serialized by the database (SQLite has a
// single writer; Postgres would use a row lock / sequence), so each gets a
// DIFFERENT value — no duplicates. The @unique on referenceNumber is the final
// backstop. We mint the number INSIDE the same transaction as the insert.
async function nextReference(tx: Prisma.TransactionClient, schoolId: string, year: number): Promise<string> {
  const key = `feedback:${schoolId}:${year}`;
  const counter = await tx.counter.upsert({
    where: { key },
    create: { key, value: 1 },
    update: { value: { increment: 1 } },
  });
  return `FB-${year}-${String(counter.value).padStart(4, "0")}`;
}

export type ThreadMessage = {
  id: string;
  senderRole: string;
  senderName: string;
  message: string;
  attachments: StoredFile[];
  createdAt: string;
};

// ---------------- PARENT ----------------

export async function createFeedback(parentId: string, schoolId: string, input: FeedbackCreateInput) {
  const year = new Date().getFullYear();
  return prisma.$transaction(async (tx) => {
    const referenceNumber = await nextReference(tx, schoolId, year);
    const fb = await tx.feedback.create({
      data: {
        referenceNumber,
        parentId,
        subject: input.subject,
        message: input.message,
        category: input.category ?? null,
        isAnonymous: input.isAnonymous ?? false,
        status: "PENDING",
        schoolId,
      },
    });
    // The original message is the FIRST entry in the thread (one timeline).
    await tx.feedbackMessage.create({
      data: {
        feedbackId: fb.id,
        senderId: parentId,
        senderRole: "PARENT",
        message: input.message,
        attachments: JSON.stringify(input.attachments ?? []),
      },
    });
    return { id: fb.id, referenceNumber };
  });
}

export async function listParentFeedback(parentId: string, schoolId: string) {
  const rows = await prisma.feedback.findMany({
    where: { parentId, schoolId },
    orderBy: { createdAt: "desc" },
    include: { messages: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  return rows.map((f) => {
    const last = f.messages[0];
    const unread = f.status === "REPLIED" && (!f.parentSeenAt || (f.lastReplyAt ? f.parentSeenAt < f.lastReplyAt : false));
    return {
      id: f.id,
      referenceNumber: f.referenceNumber,
      subject: f.subject,
      category: f.category,
      status: f.status,
      createdAt: f.createdAt.toISOString(),
      preview: f.message,
      lastMessage: last ? { role: last.senderRole, text: last.message } : null,
      unread,
    };
  });
}

export async function getParentFeedback(id: string, parentId: string, schoolId: string) {
  const fb = await prisma.feedback.findFirst({
    where: { id, parentId, schoolId },
    include: { messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } } },
  });
  if (!fb) return null;

  // Opening it marks the parent's reply (if any) as seen → clears their badge.
  await prisma.feedback.update({ where: { id }, data: { parentSeenAt: new Date() } });

  return toDetail(fb, /*stripParent*/ false);
}

export async function parentReply(id: string, parentId: string, schoolId: string, input: FeedbackReplyInput) {
  const fb = await prisma.feedback.findFirst({ where: { id, parentId, schoolId }, select: { status: true } });
  if (!fb) return { error: "NOT_FOUND" as const };

  await prisma.$transaction(async (tx) => {
    await tx.feedbackMessage.create({
      data: { feedbackId: id, senderId: parentId, senderRole: "PARENT", message: input.message, attachments: JSON.stringify(input.attachments ?? []) },
    });
    // Transition: REPLIED/CLOSED -> REOPENED; otherwise stays open.
    await tx.feedback.update({ where: { id }, data: { status: parentReplyResult(fb.status) } });
  });
  return { ok: true as const };
}

export async function parentUnreadCount(parentId: string, schoolId: string): Promise<number> {
  // Replied tickets the parent hasn't opened since the reply.
  const replied = await prisma.feedback.findMany({
    where: { parentId, schoolId, status: "REPLIED" },
    select: { parentSeenAt: true, lastReplyAt: true },
  });
  return replied.filter((f) => !f.parentSeenAt || (f.lastReplyAt ? f.parentSeenAt < f.lastReplyAt : false)).length;
}

// ---------------- PRINCIPAL ----------------

export type ListFeedbackParams = {
  schoolId: string;
  status?: string;
  category?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
};

const clean = (v?: string) => (v && v.trim() !== "" ? v : undefined);

export async function listFeedback(params: ListFeedbackParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const where: Prisma.FeedbackWhereInput = {
    schoolId: params.schoolId,
    ...(clean(params.status) ? { status: params.status } : {}),
    ...(clean(params.category) ? { category: params.category } : {}),
    ...(clean(params.search)
      ? { OR: [{ referenceNumber: { contains: params.search } }, { subject: { contains: params.search } }] }
      : {}),
    ...(clean(params.startDate) || clean(params.endDate)
      ? {
          createdAt: {
            ...(clean(params.startDate) ? { gte: new Date(params.startDate!) } : {}),
            ...(clean(params.endDate) ? { lte: new Date(`${params.endDate}T23:59:59`) } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        parent: { select: { name: true, children: { select: { class: { select: { name: true } } }, take: 1 } } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { message: true, senderRole: true } },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.feedback.count({ where }),
  ]);

  const data = rows.map((f) => ({
    id: f.id,
    referenceNumber: f.referenceNumber,
    subject: f.subject,
    category: f.category,
    status: f.status,
    createdAt: f.createdAt.toISOString(),
    lastMessage: f.messages[0] ? { role: f.messages[0].senderRole, text: f.messages[0].message } : null,
    // ANONYMITY: strip the parent identity here. For anonymous tickets the
    // response carries no name/class — only "Anonymous".
    submitter: f.isAnonymous
      ? { anonymous: true as const }
      : { anonymous: false as const, name: f.parent?.name ?? "—", childClass: f.parent?.children[0]?.class?.name ?? null },
  }));

  return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// Exact per-status counts for the clickable summary bar.
export async function feedbackCounts(schoolId: string) {
  const grouped = await prisma.feedback.groupBy({ by: ["status"], where: { schoolId }, _count: { _all: true } });
  const by = new Map(grouped.map((g) => [g.status, g._count._all]));
  return {
    total: grouped.reduce((s, g) => s + g._count._all, 0),
    pending: by.get("PENDING") ?? 0,
    replied: by.get("REPLIED") ?? 0,
    closed: by.get("CLOSED") ?? 0,
    reopened: by.get("REOPENED") ?? 0,
  };
}

// Principal badge = tickets awaiting a reply (PENDING + REOPENED).
export async function principalPendingCount(schoolId: string): Promise<number> {
  return prisma.feedback.count({ where: { schoolId, status: { in: ["PENDING", "REOPENED"] } } });
}

// DETAIL with strict anonymity: when anonymous we do NOT even query the parent
// relation, so the response object literally has no parent name/phone/email/class.
export async function getFeedback(id: string, schoolId: string) {
  const meta = await prisma.feedback.findFirst({ where: { id, schoolId }, select: { isAnonymous: true } });
  if (!meta) return null;

  const include: Prisma.FeedbackInclude = {
    messages: { orderBy: { createdAt: "asc" }, include: { sender: { select: { name: true } } } },
    ...(meta.isAnonymous
      ? {} // anonymous → don't fetch parent at all
      : {
          parent: {
            select: {
              name: true,
              phone: true,
              email: true,
              children: { select: { name: true, class: { select: { name: true } } }, take: 1 },
            },
          },
        }),
  };
  const fb = await prisma.feedback.findFirst({ where: { id, schoolId }, include });
  if (!fb) return null;
  // The conditional `include` widens Prisma's inferred type; the runtime shape
  // matches DetailRow (parent present only when not anonymous), so we narrow it.
  return toDetail(fb as unknown as DetailRow, meta.isAnonymous);
}

export async function principalReply(id: string, schoolId: string, principalId: string, input: FeedbackReplyInput) {
  const fb = await prisma.feedback.findFirst({ where: { id, schoolId }, select: { status: true } });
  if (!fb) return { error: "NOT_FOUND" as const };
  // STATE MACHINE GUARD — cannot reply to a CLOSED ticket.
  if (!canPrincipalReply(fb.status)) return { error: "ILLEGAL_TRANSITION" as const };

  await prisma.$transaction(async (tx) => {
    await tx.feedbackMessage.create({
      data: { feedbackId: id, senderId: principalId, senderRole: "PRINCIPAL", message: input.message, attachments: JSON.stringify(input.attachments ?? []) },
    });
    await tx.feedback.update({ where: { id }, data: { status: "REPLIED", lastReplyAt: new Date() } });
  });
  return { ok: true as const };
}

export async function closeFeedback(id: string, schoolId: string, principalId: string, closingNote?: string) {
  const fb = await prisma.feedback.findFirst({ where: { id, schoolId }, select: { status: true } });
  if (!fb) return { error: "NOT_FOUND" as const };
  if (!canClose(fb.status)) return { error: "ILLEGAL_TRANSITION" as const };

  await prisma.$transaction(async (tx) => {
    if (closingNote && closingNote.trim()) {
      await tx.feedbackMessage.create({
        data: { feedbackId: id, senderId: principalId, senderRole: "PRINCIPAL", message: closingNote },
      });
    }
    await tx.feedback.update({ where: { id }, data: { status: "CLOSED", closingNote: closingNote || null } });
  });
  return { ok: true as const };
}

// BULK admin update (set status and/or category on one ticket; the UI loops over
// the selected ids). This is a deliberate admin override, not a workflow action.
export async function bulkUpdate(id: string, schoolId: string, data: { status?: FeedbackStatus; category?: string }) {
  const r = await prisma.feedback.updateMany({
    where: { id, schoolId },
    data: { ...(data.status ? { status: data.status } : {}), ...(data.category ? { category: data.category } : {}) },
  });
  return r.count > 0;
}

// Shared mapper for the detail shape.
type DetailRow = {
  id: string; referenceNumber: string; subject: string; category: string | null; status: string;
  isAnonymous: boolean; closingNote: string | null; createdAt: Date;
  parent?: { name: string; phone: string | null; email: string | null; children: { name: string; class: { name: string } | null }[] } | null;
  messages: { id: string; senderRole: string; message: string; attachments: string | null; createdAt: Date; sender: { name: string } | null }[];
};
function toDetail(f: DetailRow, isAnonymous: boolean) {
  return {
    id: f.id,
    referenceNumber: f.referenceNumber,
    subject: f.subject,
    category: f.category,
    status: f.status,
    isAnonymous,
    closingNote: f.closingNote,
    createdAt: f.createdAt.toISOString(),
    // Submitter identity — present only for non-anonymous.
    submitter: isAnonymous || !f.parent
      ? { anonymous: true as const }
      : {
          anonymous: false as const,
          name: f.parent.name,
          phone: f.parent.phone,
          email: f.parent.email,
          childName: f.parent.children[0]?.name ?? null,
          childClass: f.parent.children[0]?.class?.name ?? null,
        },
    messages: f.messages.map((m): ThreadMessage => ({
      id: m.id,
      senderRole: m.senderRole,
      // Hide the parent's name on anonymous tickets even at the message level.
      senderName: isAnonymous && m.senderRole === "PARENT" ? "Anonymous Parent" : m.sender?.name ?? "—",
      message: m.message,
      attachments: parseAttachments(m.attachments),
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export type FeedbackDetail = Awaited<ReturnType<typeof getFeedback>>;
