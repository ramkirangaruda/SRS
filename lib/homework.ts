// Homework data layer. All DB access, scoped by schoolId (and by the parent's
// children for the parent functions). Attachments are stored as a JSON string in
// the `attachments` column; we parse/serialize them here.
import { prisma } from "@/lib/prisma";
import { parseAttachments } from "@/lib/homework-format";
import { deleteUploadedFile } from "@/lib/upload";
import type { StoredFile } from "@/lib/upload-constants";
import type { HomeworkCreateInput, HomeworkUpdateInput } from "@/lib/validations/homework";

export type HomeworkStatus = "ACTIVE" | "ARCHIVED";

// A due date is a calendar day → store at UTC midnight (like attendance).
function dayUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

// The shape returned to the UI for a homework item.
export type HomeworkItem = {
  id: string;
  title: string;
  description: string;
  dueDate: string; // ISO
  createdAt: string; // ISO
  status: string;
  // Raw foreign keys (needed to pre-fill the edit form).
  classId: string;
  sectionId: string | null;
  subjectId: string | null;
  className: string | null;
  sectionName: string | null;
  subjectName: string | null;
  assignedByName: string | null;
  attachments: StoredFile[];
};

const includeRelations = {
  class: { select: { name: true } },
  section: { select: { name: true } },
  subject: { select: { name: true } },
  assignedBy: { select: { name: true } },
} as const;

// Map a Prisma row (+relations) into a HomeworkItem.
function toItem(h: {
  id: string; title: string; description: string; dueDate: Date; createdAt: Date; status: string;
  attachments: string | null; classId: string; sectionId: string | null; subjectId: string | null;
  class: { name: string } | null; section: { name: string } | null;
  subject: { name: string } | null; assignedBy: { name: string } | null;
}): HomeworkItem {
  return {
    id: h.id,
    title: h.title,
    description: h.description,
    dueDate: h.dueDate.toISOString(),
    createdAt: h.createdAt.toISOString(),
    status: h.status,
    classId: h.classId,
    sectionId: h.sectionId,
    subjectId: h.subjectId,
    className: h.class?.name ?? null,
    sectionName: h.section?.name ?? null,
    subjectName: h.subject?.name ?? null,
    assignedByName: h.assignedBy?.name ?? null,
    attachments: parseAttachments(h.attachments),
  };
}

const clean = (v?: string) => (v && v.trim() !== "" ? v : undefined);

// LIST with filters + pagination. Active is sorted by due date (nearest first).
export async function listHomework(params: {
  schoolId: string;
  status?: HomeworkStatus;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  assignedById?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const status = params.status ?? "ACTIVE";
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));

  const where = {
    schoolId: params.schoolId,
    status,
    ...(clean(params.classId) ? { classId: params.classId } : {}),
    ...(clean(params.sectionId) ? { sectionId: params.sectionId } : {}),
    ...(clean(params.subjectId) ? { subjectId: params.subjectId } : {}),
    ...(clean(params.assignedById) ? { assignedById: params.assignedById } : {}),
    ...(clean(params.search) ? { title: { contains: params.search } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.homework.findMany({
      where,
      include: includeRelations,
      // Active: earliest due first. Archived: most recently changed first.
      orderBy: status === "ACTIVE" ? { dueDate: "asc" } : { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.homework.count({ where }),
  ]);

  return {
    data: rows.map(toItem),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getHomeworkById(id: string, schoolId: string): Promise<HomeworkItem | null> {
  const h = await prisma.homework.findFirst({ where: { id, schoolId }, include: includeRelations });
  return h ? toItem(h) : null;
}

export async function createHomework(input: HomeworkCreateInput, schoolId: string, assignedById: string) {
  const h = await prisma.homework.create({
    data: {
      title: input.title,
      description: input.description || "",
      dueDate: dayUTC(input.dueDate),
      attachments: JSON.stringify(input.attachments ?? []),
      classId: input.classId,
      sectionId: clean(input.sectionId) ?? null,
      subjectId: clean(input.subjectId) ?? null,
      assignedById,
      status: "ACTIVE",
      schoolId,
    },
    include: includeRelations,
  });
  return toItem(h);
}

// UPDATE. We diff old vs new attachments and DELETE the removed files from
// storage so we don't leave orphans behind.
export async function updateHomework(id: string, input: HomeworkUpdateInput, schoolId: string) {
  const existing = await prisma.homework.findFirst({ where: { id, schoolId }, select: { attachments: true } });
  if (!existing) return null;

  const oldFiles = parseAttachments(existing.attachments);
  const newFiles = input.attachments ?? [];
  const newUrls = new Set(newFiles.map((f) => f.url));
  const removed = oldFiles.filter((f) => !newUrls.has(f.url));

  const h = await prisma.homework.update({
    where: { id },
    data: {
      title: input.title,
      description: input.description || "",
      dueDate: dayUTC(input.dueDate),
      attachments: JSON.stringify(newFiles),
      classId: input.classId,
      sectionId: clean(input.sectionId) ?? null,
      subjectId: clean(input.subjectId) ?? null,
    },
    include: includeRelations,
  });

  // Clean up files that were removed during the edit.
  await Promise.all(removed.map((f) => deleteUploadedFile(f.url)));

  return toItem(h);
}

// ARCHIVE toggle (soft delete). Flips ACTIVE <-> ARCHIVED. The row + its files
// stay intact — this preserves the historical record and is fully reversible.
export async function toggleArchive(id: string, schoolId: string): Promise<string | null> {
  const h = await prisma.homework.findFirst({ where: { id, schoolId }, select: { status: true } });
  if (!h) return null;
  const next = h.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
  await prisma.homework.update({ where: { id }, data: { status: next } });
  return next;
}

// HARD DELETE. Removes the DB row AND the attachment files from storage. This is
// irreversible — used only by the explicit "delete permanently" action.
export async function deleteHomework(id: string, schoolId: string): Promise<boolean> {
  const h = await prisma.homework.findFirst({ where: { id, schoolId }, select: { id: true, attachments: true } });
  if (!h) return false;

  const files = parseAttachments(h.attachments);
  await prisma.homework.delete({ where: { id: h.id } });
  // Delete the bytes from storage AFTER the row is gone (no row → would-be orphans).
  await Promise.all(files.map((f) => deleteUploadedFile(f.url)));
  return true;
}

// ---- PARENT-facing ----

// Build the OR clause that matches homework relevant to a child: same class, and
// either no section (whole class) or the child's section.
function childClause(child: { classId: string; sectionId: string | null }) {
  return child.sectionId
    ? { classId: child.classId, OR: [{ sectionId: null }, { sectionId: child.sectionId }] }
    : { classId: child.classId, sectionId: null };
}

export type HomeworkChildGroup = {
  child: { id: string; name: string; className: string | null };
  items: HomeworkItem[];
};

// Homework for a parent's children, grouped by child. status ACTIVE = Current,
// ARCHIVED = Past (last 30 days). Ownership is structural: we only ever query
// classes/sections that the parent's own children belong to.
export async function getParentHomework(
  parentId: string,
  schoolId: string,
  status: HomeworkStatus
): Promise<HomeworkChildGroup[]> {
  const children = await prisma.student.findMany({
    where: { parentId, schoolId },
    select: { id: true, name: true, classId: true, sectionId: true, class: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  if (children.length === 0) return [];

  const where: Record<string, unknown> = {
    schoolId,
    status,
    OR: children.map(childClause),
  };
  // "Past" tab: only the last 30 days of archived homework.
  if (status === "ARCHIVED") {
    where.updatedAt = { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) };
  }

  const rows = await prisma.homework.findMany({
    where,
    include: includeRelations,
    orderBy: status === "ACTIVE" ? { dueDate: "asc" } : { updatedAt: "desc" },
  });
  const items = rows.map((r) => ({ item: toItem(r), classId: r.classId, sectionId: r.sectionId }));

  // Group: each child sees the items that match their class/section.
  return children.map((c) => ({
    child: { id: c.id, name: c.name, className: c.class?.name ?? null },
    items: items
      .filter((x) => x.classId === c.classId && (x.sectionId === null || x.sectionId === c.sectionId))
      .map((x) => x.item),
  }));
}

// One homework for a parent, only if it targets one of their children's class/section.
export async function getParentHomeworkDetail(id: string, parentId: string, schoolId: string) {
  const h = await prisma.homework.findFirst({ where: { id, schoolId }, include: includeRelations });
  if (!h) return null;

  const match = await prisma.student.findFirst({
    where: {
      parentId,
      schoolId,
      classId: h.classId,
      ...(h.sectionId ? { OR: [{ sectionId: h.sectionId }, { sectionId: null }] } : {}),
    },
    select: { id: true },
  });
  return match ? toItem(h) : null;
}

// Staff who can be "assigned by" (for the filter dropdown).
export async function listAssigners(schoolId: string) {
  return prisma.user.findMany({
    where: { schoolId, role: { in: ["PRINCIPAL", "TEACHER"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// All subjects in the school (for the subject filter + form select).
export async function listSubjects(schoolId: string) {
  return prisma.subject.findMany({
    where: { schoolId },
    select: { id: true, name: true, classId: true },
    orderBy: { name: "asc" },
  });
}

// Recent active homework for a class/section — for the student detail tab.
export async function getHomeworkForClass(
  classId: string,
  sectionId: string | null,
  schoolId: string,
  limit = 5
): Promise<HomeworkItem[]> {
  const rows = await prisma.homework.findMany({
    where: {
      schoolId,
      status: "ACTIVE",
      classId,
      ...(sectionId ? { OR: [{ sectionId: null }, { sectionId }] } : {}),
    },
    include: includeRelations,
    orderBy: { dueDate: "asc" },
    take: limit,
  });
  return rows.map(toItem);
}
