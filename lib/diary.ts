// School Diary data layer. Cursor-paginated feed, CRUD with author/principal
// authorization, the parent feed (scoped to their children's classes), and
// per-user read tracking via the DiaryRead table.
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import { parseAttachments } from "@/lib/homework-format";
import { deleteUploadedFile } from "@/lib/upload";
import { encodeCursor, cursorWhere } from "@/lib/cursor";
import type { StoredFile } from "@/lib/upload-constants";
import type { DiaryCreateInput, DiaryUpdateInput } from "@/lib/validations/diary";

const PAGE = 10;
const clean = (v?: string) => (v && v.trim() !== "" ? v : undefined);
function dayUTC(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export type DiaryItem = {
  id: string;
  title: string;
  content: string;
  date: string;
  createdAt: string;
  classId: string;
  sectionId: string | null;
  className: string | null;
  sectionName: string | null;
  postedById: string;
  postedByName: string | null;
  postedByPhoto: string | null;
  attachments: StoredFile[];
  read?: boolean; // only set in parent feed
};

const include = {
  class: { select: { name: true } },
  section: { select: { name: true } },
  postedBy: { select: { name: true, avatar: true } },
} as const;

type Row = {
  id: string; title: string; content: string; date: Date; createdAt: Date;
  classId: string; sectionId: string | null; attachments: string | null;
  postedById: string;
  class: { name: string } | null; section: { name: string } | null;
  postedBy: { name: string; avatar: string | null } | null;
  reads?: { id: string }[];
};
function toItem(h: Row): DiaryItem {
  return {
    id: h.id,
    title: h.title,
    content: h.content,
    date: h.date.toISOString(),
    createdAt: h.createdAt.toISOString(),
    classId: h.classId,
    sectionId: h.sectionId,
    className: h.class?.name ?? null,
    sectionName: h.section?.name ?? null,
    postedById: h.postedById,
    postedByName: h.postedBy?.name ?? null,
    postedByPhoto: h.postedBy?.avatar ?? null,
    attachments: parseAttachments(h.attachments),
    ...(h.reads ? { read: h.reads.length > 0 } : {}),
  };
}

// CURSOR-PAGINATED principal/teacher feed, newest diary date first.
export async function listDiary(params: {
  schoolId: string;
  classId?: string;
  sectionId?: string;
  authorId?: string;
  startDate?: string;
  endDate?: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = params.limit ?? PAGE;
  const where = {
    schoolId: params.schoolId,
    ...(clean(params.classId) ? { classId: params.classId } : {}),
    ...(clean(params.sectionId) ? { sectionId: params.sectionId } : {}),
    ...(clean(params.authorId) ? { postedById: params.authorId } : {}),
    ...(clean(params.startDate) || clean(params.endDate)
      ? {
          date: {
            ...(clean(params.startDate) ? { gte: dayUTC(params.startDate!) } : {}),
            ...(clean(params.endDate) ? { lte: dayUTC(params.endDate!) } : {}),
          },
        }
      : {}),
    // "everything after the cursor" — ordered by (date DESC, id DESC).
    ...cursorWhere("date", params.cursor),
  };

  const rows = await prisma.schoolDiary.findMany({
    where,
    include,
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: limit,
  });

  const data = rows.map(toItem);
  // If we filled the page, there may be more → hand back a cursor to the last row.
  const nextCursor = rows.length === limit ? encodeCursor(rows[rows.length - 1].date.toISOString(), rows[rows.length - 1].id) : null;
  return { data, nextCursor };
}

export async function getDiaryById(id: string, schoolId: string): Promise<DiaryItem | null> {
  const h = await prisma.schoolDiary.findFirst({ where: { id, schoolId }, include });
  return h ? toItem(h) : null;
}

export async function createDiary(input: DiaryCreateInput, schoolId: string, postedById: string) {
  const h = await prisma.schoolDiary.create({
    data: {
      title: input.title,
      content: input.content,
      date: dayUTC(input.date),
      attachments: JSON.stringify(input.attachments ?? []),
      classId: input.classId,
      sectionId: clean(input.sectionId) ?? null,
      postedById,
      schoolId,
    },
    include,
  });
  return toItem(h);
}

// Only the AUTHOR or a PRINCIPAL may edit/delete. Returns null if not allowed/found.
async function canModify(id: string, schoolId: string, user: { id: string; role: string }) {
  const row = await prisma.schoolDiary.findFirst({ where: { id, schoolId }, select: { postedById: true, attachments: true } });
  if (!row) return null;
  if (row.postedById !== user.id && user.role !== ROLES.PRINCIPAL) return "forbidden" as const;
  return row;
}

export async function updateDiary(id: string, input: DiaryUpdateInput, schoolId: string, user: { id: string; role: string }) {
  const row = await canModify(id, schoolId, user);
  if (!row) return { error: "not_found" as const };
  if (row === "forbidden") return { error: "forbidden" as const };

  const oldFiles = parseAttachments(row.attachments);
  const newFiles = input.attachments ?? [];
  const newUrls = new Set(newFiles.map((f) => f.url));
  const removed = oldFiles.filter((f) => !newUrls.has(f.url));

  const h = await prisma.schoolDiary.update({
    where: { id },
    data: {
      title: input.title,
      content: input.content,
      date: dayUTC(input.date),
      attachments: JSON.stringify(newFiles),
      classId: input.classId,
      sectionId: clean(input.sectionId) ?? null,
    },
    include,
  });
  await Promise.all(removed.map((f) => deleteUploadedFile(f.url)));
  return { item: toItem(h) };
}

export async function deleteDiary(id: string, schoolId: string, user: { id: string; role: string }) {
  const row = await canModify(id, schoolId, user);
  if (!row) return { error: "not_found" as const };
  if (row === "forbidden") return { error: "forbidden" as const };
  const files = parseAttachments(row.attachments);
  await prisma.schoolDiary.delete({ where: { id } });
  await Promise.all(files.map((f) => deleteUploadedFile(f.url)));
  return { ok: true as const };
}

// ---- PARENT ----

// OR clause matching diary relevant to a child (their class, whole-class or their section).
function childClause(child: { classId: string; sectionId: string | null }) {
  return child.sectionId
    ? { classId: child.classId, OR: [{ sectionId: null }, { sectionId: child.sectionId }] }
    : { classId: child.classId, sectionId: null };
}

async function parentChildren(parentId: string, schoolId: string) {
  return prisma.student.findMany({
    where: { parentId, schoolId },
    select: { id: true, name: true, classId: true, sectionId: true, class: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
}

// Parent feed, cursor-paginated. Includes per-entry read flag for THIS parent.
// `childId` optionally narrows to one child.
export async function getParentDiary(params: {
  parentId: string;
  schoolId: string;
  childId?: string;
  cursor?: string;
  limit?: number;
}) {
  const limit = params.limit ?? PAGE;
  const children = await parentChildren(params.parentId, params.schoolId);
  const relevant = params.childId ? children.filter((c) => c.id === params.childId) : children;
  if (relevant.length === 0) return { data: [], nextCursor: null, children: children.map(toChildOpt) };

  const where = {
    schoolId: params.schoolId,
    OR: relevant.map(childClause),
    ...cursorWhere("date", params.cursor),
  };

  const rows = await prisma.schoolDiary.findMany({
    where,
    include: {
      ...include,
      // Only fetch THIS parent's read marker for each entry.
      reads: { where: { userId: params.parentId }, select: { id: true } },
    },
    orderBy: [{ date: "desc" }, { id: "desc" }],
    take: limit,
  });

  const data = rows.map(toItem);
  const nextCursor = rows.length === limit ? encodeCursor(rows[rows.length - 1].date.toISOString(), rows[rows.length - 1].id) : null;
  return { data, nextCursor, children: children.map(toChildOpt) };
}

function toChildOpt(c: { id: string; name: string; class: { name: string } | null }) {
  return { id: c.id, name: c.name, className: c.class?.name ?? null };
}

// Verify a diary entry is relevant to this parent, then mark it read (idempotent).
export async function markDiaryRead(diaryId: string, parentId: string, schoolId: string) {
  const children = await parentChildren(parentId, schoolId);
  const entry = await prisma.schoolDiary.findFirst({ where: { id: diaryId, schoolId }, select: { classId: true, sectionId: true } });
  if (!entry) return false;
  const relevant = children.some(
    (c) => c.classId === entry.classId && (entry.sectionId === null || c.sectionId === entry.sectionId)
  );
  if (!relevant) return false;
  await prisma.diaryRead.upsert({
    where: { schoolDiaryId_userId: { schoolDiaryId: diaryId, userId: parentId } },
    create: { schoolDiaryId: diaryId, userId: parentId },
    update: {}, // already read → no change
  });
  return true;
}

// Unread diary count for the badge. `reads: { none: { userId } }` compiles to a
// NOT EXISTS subquery (indexed), so we never load entries — just count the ones
// with no read marker. Bounded to the last 30 days to keep it cheap.
export async function diaryUnreadCount(parentId: string, schoolId: string): Promise<number> {
  const children = await parentChildren(parentId, schoolId);
  if (children.length === 0) return 0;
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return prisma.schoolDiary.count({
    where: {
      schoolId,
      createdAt: { gte: since },
      OR: children.map(childClause),
      reads: { none: { userId: parentId } },
    },
  });
}
