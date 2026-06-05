// Videos data layer. A video is either an external link (YouTube/Vimeo, embedded
// via iframe) or a direct upload (HTML5 <video>). We store only a URL + metadata
// — never the bytes for external videos.
import { prisma } from "@/lib/prisma";
import { deleteUploadedFile } from "@/lib/upload";

const clean = (v?: string) => (v && v.trim() !== "" ? v : undefined);

function audienceWhere(classIds?: string[]) {
  if (!classIds) return {};
  // ALL videos, or CLASSES videos — we post-filter CLASSES in JS (JSON column).
  return {};
}

export async function listVideos(params: {
  schoolId: string; search?: string; category?: string; sort?: string; page?: number; pageSize?: number; classIds?: string[];
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = params.pageSize ?? 12;
  const where = {
    schoolId: params.schoolId,
    ...(clean(params.search) ? { title: { contains: params.search } } : {}),
    ...(clean(params.category) ? { category: params.category } : {}),
    ...audienceWhere(params.classIds),
  };
  const orderBy = params.sort === "views" ? { viewCount: "desc" as const } : params.sort === "title" ? { title: "asc" as const } : { createdAt: "desc" as const };

  let rows = await prisma.video.findMany({ where, orderBy, skip: (page - 1) * pageSize, take: pageSize });
  if (params.classIds) {
    const mine = new Set(params.classIds);
    rows = rows.filter((v) => v.targetRole !== "CLASSES" || (v.targetClassIds ? (JSON.parse(v.targetClassIds) as string[]).some((c) => mine.has(c)) : false));
  }
  const total = await prisma.video.count({ where });
  return {
    data: rows.map((v) => ({ id: v.id, title: v.title, thumbnailUrl: v.thumbnailUrl, duration: v.duration, viewCount: v.viewCount, source: v.source, category: v.category, createdAt: v.createdAt.toISOString() })),
    total, page, hasMore: page * pageSize < total,
  };
}

export async function getVideo(id: string, schoolId: string, incrementView = false) {
  const v = await prisma.video.findFirst({ where: { id, schoolId }, include: { uploadedBy: { select: { name: true } } } });
  if (!v) return null;
  if (incrementView) await prisma.video.update({ where: { id }, data: { viewCount: { increment: 1 } } });
  const related = await prisma.video.findMany({ where: { schoolId, id: { not: id } }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true, title: true, thumbnailUrl: true, viewCount: true } });
  return {
    id: v.id, title: v.title, description: v.description, source: v.source, videoUrl: v.videoUrl, embedUrl: v.embedUrl,
    thumbnailUrl: v.thumbnailUrl, duration: v.duration, category: v.category, viewCount: v.viewCount + (incrementView ? 1 : 0),
    uploadedByName: v.uploadedBy?.name ?? null, createdAt: v.createdAt.toISOString(),
    related: related.map((r) => ({ id: r.id, title: r.title, thumbnailUrl: r.thumbnailUrl, viewCount: r.viewCount })),
  };
}

export async function createVideo(schoolId: string, uploadedById: string, input: {
  title: string; description?: string; source: string; videoUrl: string; embedUrl?: string; thumbnailUrl?: string;
  duration?: string; category?: string; targetRole?: string; targetClassIds?: string[];
}) {
  return prisma.video.create({
    data: {
      title: input.title, description: input.description || null, source: input.source, videoUrl: input.videoUrl,
      embedUrl: input.embedUrl || null, thumbnailUrl: input.thumbnailUrl || null, duration: input.duration || null,
      category: input.category || null,
      targetRole: input.targetRole === "CLASSES" ? "CLASSES" : "ALL",
      targetClassIds: input.targetRole === "CLASSES" ? JSON.stringify(input.targetClassIds ?? []) : null,
      uploadedById, schoolId,
    },
  });
}

export async function updateVideo(id: string, schoolId: string, input: { title?: string; description?: string; category?: string }) {
  const r = await prisma.video.updateMany({ where: { id, schoolId }, data: { ...(input.title !== undefined ? { title: input.title } : {}), ...(input.description !== undefined ? { description: input.description || null } : {}), ...(input.category !== undefined ? { category: input.category || null } : {}) } });
  return r.count > 0;
}

export async function deleteVideo(id: string, schoolId: string) {
  const v = await prisma.video.findFirst({ where: { id, schoolId }, select: { id: true, source: true, videoUrl: true } });
  if (!v) return false;
  await prisma.video.delete({ where: { id: v.id } });
  if (v.source === "UPLOAD") await deleteUploadedFile(v.videoUrl); // remove the stored file
  return true;
}
