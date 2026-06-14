// Planners & Resources data layer.
//
// This is a CRUD resource manager (contrast with the meeting room's collaborative
// model): plain create/read/update/delete + filtering + a couple of special
// operations (duplicate, batch, atomic download counter).
import { prisma } from "@/lib/prisma";

export const PLANNER_TYPES = ["LESSON_PLAN", "ACTIVITY", "WEEKLY_PLAN", "MONTHLY_PLAN", "OTHER"] as const;
export const RESOURCE_TYPES = ["DOCUMENT", "VIDEO", "LINK", "WORKSHEET", "PRESENTATION"] as const;

const clean = (v?: string | null) => (v && v.trim() !== "" ? v.trim() : null);

// ---- PLANNERS ----

const plannerInclude = {
  class: { select: { name: true } },
  subject: { select: { name: true } },
  createdBy: { select: { name: true } },
} as const;

export async function listPlanners(schoolId: string, opts: { type?: string; classId?: string; subjectId?: string; createdById?: string; search?: string; page?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 20;
  const where = {
    schoolId,
    ...(clean(opts.type) ? { type: opts.type } : {}),
    ...(clean(opts.classId) ? { classId: opts.classId } : {}),
    ...(clean(opts.subjectId) ? { subjectId: opts.subjectId } : {}),
    ...(clean(opts.createdById) ? { createdById: opts.createdById } : {}),
    ...(clean(opts.search) ? { OR: [{ title: { contains: opts.search, mode: "insensitive" as const } }, { description: { contains: opts.search, mode: "insensitive" as const } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.planner.findMany({ where, include: plannerInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.planner.count({ where }),
  ]);
  return { data: rows.map(toPlanner), total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

function toPlanner(p: {
  id: string; title: string; description: string | null; type: string; fileUrl: string | null; fileName: string | null;
  classId: string | null; subjectId: string | null; createdById: string; createdAt: Date;
  class: { name: string } | null; subject: { name: string } | null; createdBy: { name: string } | null;
}) {
  return {
    id: p.id, title: p.title, description: p.description, type: p.type, fileUrl: p.fileUrl, fileName: p.fileName,
    classId: p.classId, subjectId: p.subjectId, createdById: p.createdById, createdAt: p.createdAt.toISOString(),
    className: p.class?.name ?? null, subjectName: p.subject?.name ?? null, createdByName: p.createdBy?.name ?? null,
  };
}

export async function getPlanner(id: string, schoolId: string) {
  const p = await prisma.planner.findFirst({ where: { id, schoolId }, include: plannerInclude });
  return p ? toPlanner(p) : null;
}

export async function createPlanner(input: { title: string; description?: string | null; type: string; fileUrl?: string | null; fileName?: string | null; classId?: string | null; subjectId?: string | null }, schoolId: string, createdById: string) {
  const p = await prisma.planner.create({
    data: { title: input.title, description: clean(input.description), type: input.type, fileUrl: clean(input.fileUrl), fileName: clean(input.fileName), classId: clean(input.classId), subjectId: clean(input.subjectId), createdById, schoolId },
    include: plannerInclude,
  });
  return toPlanner(p);
}

// Edit — only the creator or a principal may. The caller passes isPrincipal.
export async function updatePlanner(id: string, input: { title: string; description?: string | null; type: string; fileUrl?: string | null; fileName?: string | null; classId?: string | null; subjectId?: string | null }, schoolId: string, userId: string, isPrincipal: boolean) {
  const existing = await prisma.planner.findFirst({ where: { id, schoolId }, select: { createdById: true } });
  if (!existing) return null;
  if (!isPrincipal && existing.createdById !== userId) return "forbidden" as const;
  const p = await prisma.planner.update({
    where: { id },
    data: { title: input.title, description: clean(input.description), type: input.type, fileUrl: clean(input.fileUrl), fileName: clean(input.fileName), classId: clean(input.classId), subjectId: clean(input.subjectId) },
    include: plannerInclude,
  });
  return toPlanner(p);
}

export async function deletePlanner(id: string, schoolId: string, userId: string, isPrincipal: boolean) {
  const existing = await prisma.planner.findFirst({ where: { id, schoolId }, select: { createdById: true } });
  if (!existing) return "notfound" as const;
  if (!isPrincipal && existing.createdById !== userId) return "forbidden" as const;
  await prisma.planner.delete({ where: { id } });
  return "ok" as const;
}

// DUPLICATE (deep copy). Here the planner has no child rows, so the "deep copy"
// is: read the source, then create a NEW row with the same scalar fields (never
// reuse the id/timestamps), title suffixed "(Copy)", owned by the duplicator.
// If a model had relations you'd also re-create each related row pointing at the
// new parent id — never copy foreign keys that point back at the original.
export async function duplicatePlanner(id: string, schoolId: string, userId: string) {
  const src = await prisma.planner.findFirst({ where: { id, schoolId } });
  if (!src) return null;
  const p = await prisma.planner.create({
    data: { title: `${src.title} (Copy)`, description: src.description, type: src.type, fileUrl: src.fileUrl, fileName: src.fileName, classId: src.classId, subjectId: src.subjectId, createdById: userId, schoolId },
    include: plannerInclude,
  });
  return toPlanner(p);
}

// ---- RESOURCES ----

const resourceInclude = { subject: { select: { name: true } }, uploadedBy: { select: { name: true } } } as const;

type ResourceRow = {
  id: string; title: string; description: string | null; fileUrl: string | null; externalUrl: string | null;
  fileName: string | null; fileSize: number | null; fileType: string | null; type: string; downloadCount: number;
  isPublic: boolean; subjectId: string | null; uploadedById: string; createdAt: Date;
  subject: { name: string } | null; uploadedBy: { name: string } | null;
};

function toResource(r: ResourceRow) {
  return {
    id: r.id, title: r.title, description: r.description, fileUrl: r.fileUrl, externalUrl: r.externalUrl,
    fileName: r.fileName, fileSize: r.fileSize, fileType: r.fileType, type: r.type, downloadCount: r.downloadCount,
    isPublic: r.isPublic, subjectId: r.subjectId, subjectName: r.subject?.name ?? null,
    uploadedById: r.uploadedById, uploadedByName: r.uploadedBy?.name ?? null, createdAt: r.createdAt.toISOString(),
  };
}

export async function listResources(schoolId: string, opts: { subjectId?: string; type?: string; search?: string; page?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 30;
  const where = {
    schoolId,
    ...(clean(opts.subjectId) ? { subjectId: opts.subjectId } : {}),
    ...(clean(opts.type) ? { type: opts.type } : {}),
    ...(clean(opts.search) ? { OR: [{ title: { contains: opts.search, mode: "insensitive" as const } }, { description: { contains: opts.search, mode: "insensitive" as const } }, { subject: { name: { contains: opts.search, mode: "insensitive" as const } } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.resource.findMany({ where, include: resourceInclude, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.resource.count({ where }),
  ]);
  return { data: rows.map(toResource), total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// Folder view: each subject + how many resources it holds (+ an "Unfiled" bucket).
export async function resourceSubjects(schoolId: string) {
  const grouped = await prisma.resource.groupBy({ by: ["subjectId"], where: { schoolId }, _count: { _all: true } });
  const subjectIds = grouped.map((g) => g.subjectId).filter((x): x is string => !!x);
  const subjects = await prisma.subject.findMany({ where: { id: { in: subjectIds } }, select: { id: true, name: true } });
  const nameById = new Map(subjects.map((s) => [s.id, s.name]));
  return grouped.map((g) => ({ subjectId: g.subjectId, subjectName: g.subjectId ? nameById.get(g.subjectId) ?? "Unknown" : "Unfiled", count: g._count._all }))
    .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
}

export async function createResource(input: { title: string; description?: string | null; type: string; subjectId?: string | null; fileUrl?: string | null; externalUrl?: string | null; fileName?: string | null; fileSize?: number | null; fileType?: string | null; isPublic?: boolean }, schoolId: string, uploadedById: string) {
  const r = await prisma.resource.create({
    data: {
      title: input.title, description: clean(input.description), type: input.type, subjectId: clean(input.subjectId),
      fileUrl: clean(input.fileUrl), externalUrl: clean(input.externalUrl), fileName: clean(input.fileName),
      fileSize: input.fileSize ?? null, fileType: clean(input.fileType), isPublic: input.isPublic ?? false, uploadedById, schoolId,
    },
    include: resourceInclude,
  });
  return toResource(r);
}

// BATCH create — one row per uploaded file, title auto-derived from the filename
// (extension stripped). Used after a multi-file upload: the route saves each file,
// then calls this once with all the metadata. createMany = a single INSERT.
export async function batchCreateResources(files: { fileUrl: string; fileName: string; fileSize: number; fileType: string }[], common: { subjectId?: string | null; type: string; isPublic?: boolean }, schoolId: string, uploadedById: string) {
  const titleFromName = (name: string) => name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim() || name;
  await prisma.resource.createMany({
    data: files.map((f) => ({
      title: titleFromName(f.fileName), type: common.type, subjectId: clean(common.subjectId),
      fileUrl: f.fileUrl, fileName: f.fileName, fileSize: f.fileSize, fileType: f.fileType,
      isPublic: common.isPublic ?? false, uploadedById, schoolId,
    })),
  });
  return files.length;
}

// ATOMIC INCREMENT of the download counter.
//
// If two users download at the same time and we did read-modify-write in app code
// (count = count + 1), both could read 5 and both write 6 — a lost update (a race
// condition). Prisma's `{ increment: 1 }` compiles to SQL `downloadCount =
// downloadCount + 1`, which the database executes atomically under a row lock, so
// concurrent downloads each count exactly once. Returns the file URL to open.
export async function recordDownload(id: string, schoolId: string) {
  const r = await prisma.resource.findFirst({ where: { id, schoolId }, select: { id: true, fileUrl: true, externalUrl: true } });
  if (!r) return null;
  await prisma.resource.update({ where: { id }, data: { downloadCount: { increment: 1 } } });
  return r.fileUrl ?? r.externalUrl ?? null;
}

export async function updateResource(id: string, input: { title: string; description?: string | null; type: string; subjectId?: string | null; isPublic?: boolean }, schoolId: string, userId: string, isPrincipal: boolean) {
  const existing = await prisma.resource.findFirst({ where: { id, schoolId }, select: { uploadedById: true } });
  if (!existing) return null;
  if (!isPrincipal && existing.uploadedById !== userId) return "forbidden" as const;
  const r = await prisma.resource.update({
    where: { id },
    data: { title: input.title, description: clean(input.description), type: input.type, subjectId: clean(input.subjectId), isPublic: input.isPublic },
    include: resourceInclude,
  });
  return toResource(r);
}

export async function deleteResource(id: string, schoolId: string, userId: string, isPrincipal: boolean) {
  const existing = await prisma.resource.findFirst({ where: { id, schoolId }, select: { uploadedById: true } });
  if (!existing) return "notfound" as const;
  if (!isPrincipal && existing.uploadedById !== userId) return "forbidden" as const;
  await prisma.resource.delete({ where: { id } });
  return "ok" as const;
}

// PARENT: only public resources, read-only.
export async function listPublicResources(schoolId: string) {
  const rows = await prisma.resource.findMany({ where: { schoolId, isPublic: true }, include: resourceInclude, orderBy: { createdAt: "desc" } });
  return rows.map(toResource);
}
