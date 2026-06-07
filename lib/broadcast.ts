// Broadcast data layer. The recipient list (BroadcastRecipient) is authoritative:
// at send time we resolve the target user set and bulk-insert one row per user
// with createMany, then read tracking + "x/y read" + the inbox all key off that
// table. Soft delete keeps sent messages on record.
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { parseAttachments } from "@/lib/homework-format";
import { encodeCursor, cursorWhere } from "@/lib/cursor";
import { sendToMany } from "@/lib/push";
import { logActivity } from "@/lib/activity";
import type { StoredFile } from "@/lib/upload-constants";
import type { BroadcastCreateInput, AudienceInput } from "@/lib/validations/broadcast";

const PAGE = 10;

// Resolve a target selection into a concrete set of user ids + a display label.
// Used by BOTH the preview endpoint and the actual send, so they never disagree.
export async function resolveAudience(
  schoolId: string,
  targetRole: AudienceInput["targetRole"],
  classes: AudienceInput["classes"]
): Promise<{ userIds: string[]; label: string }> {
  if (targetRole === "ALL") {
    const users = await prisma.user.findMany({ where: { schoolId }, select: { id: true } });
    return { userIds: users.map((u) => u.id), label: "All users" };
  }
  if (targetRole === "PARENTS") {
    const users = await prisma.user.findMany({ where: { schoolId, role: ROLES.PARENT }, select: { id: true } });
    return { userIds: users.map((u) => u.id), label: "All parents" };
  }
  if (targetRole === "TEACHERS") {
    const users = await prisma.user.findMany({ where: { schoolId, role: ROLES.TEACHER }, select: { id: true } });
    return { userIds: users.map((u) => u.id), label: "All teachers" };
  }

  // CLASSES: parents of students in the selected class/section pairs.
  const pairs = classes ?? [];
  const studentWhere = {
    schoolId,
    OR: pairs.map((p) => (p.sectionId ? { classId: p.classId, sectionId: p.sectionId } : { classId: p.classId })),
  };
  const students = await prisma.student.findMany({ where: studentWhere, select: { parentId: true } });
  const userIds = Array.from(new Set(students.map((s) => s.parentId).filter((x): x is string => !!x)));

  // Build a readable label from the class/section names.
  const classIds = Array.from(new Set(pairs.map((p) => p.classId)));
  const sectionIds = pairs.map((p) => p.sectionId).filter((x): x is string => !!x);
  const [cls, secs] = await Promise.all([
    prisma.class.findMany({ where: { id: { in: classIds } }, select: { id: true, name: true } }),
    prisma.section.findMany({ where: { id: { in: sectionIds } }, select: { id: true, name: true } }),
  ]);
  const clsName = new Map(cls.map((c) => [c.id, c.name]));
  const secName = new Map(secs.map((s) => [s.id, s.name]));
  const parts = pairs.map((p) => `Class ${clsName.get(p.classId) ?? "?"}${p.sectionId ? ` - ${secName.get(p.sectionId) ?? "?"}` : ""}`);
  return { userIds, label: `Parents of ${parts.join(", ")}` };
}

export type BroadcastListItem = {
  id: string;
  title: string;
  message: string;
  urgent: boolean;
  targetRole: string;
  targetLabel: string | null;
  sentByName: string | null;
  createdAt: string;
  attachments: StoredFile[];
  readCount: number;
  totalCount: number;
};

// Attach total + read counts to a set of broadcasts in TWO grouped queries
// (not one per row).
async function withCounts(ids: string[]) {
  if (ids.length === 0) return { total: new Map<string, number>(), read: new Map<string, number>() };
  const [totals, reads] = await Promise.all([
    prisma.broadcastRecipient.groupBy({ by: ["broadcastId"], where: { broadcastId: { in: ids } }, _count: { _all: true } }),
    prisma.broadcastRecipient.groupBy({ by: ["broadcastId"], where: { broadcastId: { in: ids }, readAt: { not: null } }, _count: { _all: true } }),
  ]);
  return {
    total: new Map(totals.map((t) => [t.broadcastId, t._count._all])),
    read: new Map(reads.map((r) => [r.broadcastId, r._count._all])),
  };
}

// CURSOR-PAGINATED list of sent broadcasts (principal view), newest first.
export async function listBroadcasts(schoolId: string, cursor?: string, limit = PAGE) {
  const rows = await prisma.broadcastMessage.findMany({
    where: { schoolId, deletedAt: null, ...cursorWhere("createdAt", cursor) },
    include: { sentBy: { select: { name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: limit,
  });
  const counts = await withCounts(rows.map((r) => r.id));
  const data: BroadcastListItem[] = rows.map((r) => ({
    id: r.id,
    title: r.title,
    message: r.message,
    urgent: r.urgent,
    targetRole: r.targetRole,
    targetLabel: r.targetLabel,
    sentByName: r.sentBy?.name ?? null,
    createdAt: r.createdAt.toISOString(),
    attachments: parseAttachments(r.attachments),
    totalCount: counts.total.get(r.id) ?? 0,
    readCount: counts.read.get(r.id) ?? 0,
  }));
  const nextCursor = rows.length === limit ? encodeCursor(rows[rows.length - 1].createdAt.toISOString(), rows[rows.length - 1].id) : null;
  return { data, nextCursor };
}

// Single broadcast + the full recipient read/unread list (for the detail page).
export async function getBroadcastById(id: string, schoolId: string) {
  const r = await prisma.broadcastMessage.findFirst({
    where: { id, schoolId, deletedAt: null },
    include: {
      sentBy: { select: { name: true } },
      recipients: {
        include: { user: { select: { name: true, email: true, role: true } } },
        orderBy: { user: { name: "asc" } },
      },
    },
  });
  if (!r) return null;
  const recipients = r.recipients.map((rc) => ({
    userId: rc.userId,
    name: rc.user?.name ?? "—",
    role: rc.user?.role ?? "",
    read: rc.readAt !== null,
  }));
  return {
    id: r.id,
    title: r.title,
    message: r.message,
    urgent: r.urgent,
    targetRole: r.targetRole,
    targetLabel: r.targetLabel,
    sentByName: r.sentBy?.name ?? null,
    createdAt: r.createdAt.toISOString(),
    attachments: parseAttachments(r.attachments),
    recipients,
    totalCount: recipients.length,
    readCount: recipients.filter((x) => x.read).length,
  };
}

// CREATE + fan out recipients in one transaction.
export async function createBroadcast(input: BroadcastCreateInput, schoolId: string, sentById: string) {
  const { userIds, label } = await resolveAudience(schoolId, input.targetRole, input.classes);

  const result = await prisma.$transaction(async (tx) => {
    const broadcast = await tx.broadcastMessage.create({
      data: {
        title: input.title,
        message: input.message,
        targetRole: input.targetRole,
        targetLabel: label,
        urgent: input.urgent ?? false,
        attachments: JSON.stringify(input.attachments ?? []),
        sentById,
        schoolId,
      },
    });

    // BULK insert one recipient row per user. createMany issues a SINGLE
    // INSERT ... VALUES (...),(...),... — far better than 200 separate inserts.
    if (userIds.length > 0) {
      await tx.broadcastRecipient.createMany({
        data: userIds.map((uid) => ({ broadcastId: broadcast.id, userId: uid })),
        // skip if somehow a (broadcast,user) row already exists.
      });
    }
    return { id: broadcast.id, count: userIds.length };
  });

  // PUSH happens AFTER the transaction commits — it's network I/O (web-push) and
  // must not hold a DB transaction open or roll back the broadcast if a push
  // fails. sendPushNotification itself checks each user's BROADCAST preference
  // (send-time filtering) and writes the in-app Notification row, so the inbox
  // (BroadcastRecipient, created for everyone above) and the bell/push (pref-gated)
  // stay correctly separate. Fire-and-forget.
  void sendToMany(userIds, { title: input.title, body: input.message, url: "/parent/messages", type: "BROADCAST" });
  void logActivity({ schoolId, performedById: sentById, action: "BROADCAST_SENT", description: `Broadcast sent: ${input.title}`, entityType: "BroadcastMessage", entityId: result.id });
  return result;
}

export async function softDeleteBroadcast(id: string, schoolId: string) {
  const r = await prisma.broadcastMessage.updateMany({ where: { id, schoolId, deletedAt: null }, data: { deletedAt: new Date() } });
  return r.count > 0;
}

// ---- RECIPIENT (parent/teacher) side ----

// Mark a broadcast read for the current user (only updates THEIR own row, and
// only if currently unread). Returns true if it flipped unread→read.
export async function markBroadcastRead(broadcastId: string, userId: string) {
  const r = await prisma.broadcastRecipient.updateMany({
    where: { broadcastId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  return r.count > 0;
}

export type InboxItem = {
  id: string;
  title: string;
  message: string;
  urgent: boolean;
  sentByName: string | null;
  createdAt: string;
  attachments: StoredFile[];
  read: boolean;
};

// Inbox: broadcasts this user is a recipient of (not deleted), newest first.
export async function getInbox(userId: string, cursor?: string, limit = PAGE) {
  const rows = await prisma.broadcastRecipient.findMany({
    where: {
      userId,
      broadcast: { deletedAt: null, ...cursorWhere("createdAt", cursor) },
    },
    include: { broadcast: { include: { sentBy: { select: { name: true } } } } },
    orderBy: { broadcast: { createdAt: "desc" } },
    take: limit,
  });

  const data: InboxItem[] = rows.map((r) => ({
    id: r.broadcast.id,
    title: r.broadcast.title,
    message: r.broadcast.message,
    urgent: r.broadcast.urgent,
    sentByName: r.broadcast.sentBy?.name ?? null,
    createdAt: r.broadcast.createdAt.toISOString(),
    attachments: parseAttachments(r.broadcast.attachments),
    read: r.readAt !== null,
  }));
  const last = rows[rows.length - 1];
  const nextCursor = rows.length === limit ? encodeCursor(last.broadcast.createdAt.toISOString(), last.broadcast.id) : null;
  return { data, nextCursor };
}

// One broadcast for a recipient (only if they're actually a recipient).
export async function getInboxMessage(broadcastId: string, userId: string) {
  const r = await prisma.broadcastRecipient.findFirst({
    where: { broadcastId, userId, broadcast: { deletedAt: null } },
    include: { broadcast: { include: { sentBy: { select: { name: true } } } } },
  });
  if (!r) return null;
  return {
    id: r.broadcast.id,
    title: r.broadcast.title,
    message: r.broadcast.message,
    urgent: r.broadcast.urgent,
    sentByName: r.broadcast.sentBy?.name ?? null,
    createdAt: r.broadcast.createdAt.toISOString(),
    attachments: parseAttachments(r.broadcast.attachments),
    read: r.readAt !== null,
  };
}

// Unread message count for the badge. Index [userId, readAt] makes this an
// index range count — it never scans the messages themselves.
export async function messagesUnreadCount(userId: string): Promise<number> {
  return prisma.broadcastRecipient.count({
    where: { userId, readAt: null, broadcast: { deletedAt: null } },
  });
}
