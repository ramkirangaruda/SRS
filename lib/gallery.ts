// Gallery data layer. Albums + photos. Photos are processed by Sharp into thumb
// + full versions (see lib/image-processing). Album detail is paginated (20 at a
// time) for infinite scroll — so a 500-photo album never loads all at once.
import { prisma } from "@/lib/prisma";
import { processGalleryPhoto, deleteAlbumFolder, deletePhotoFiles } from "@/lib/image-processing";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export type AlbumCard = {
  id: string; title: string; description: string | null; cover: string | null;
  photoCount: number; date: string | null; createdAt: string; isNew: boolean;
};

export async function listAlbums(schoolId: string, sort: "newest" | "oldest" | "photos" = "newest"): Promise<AlbumCard[]> {
  const orderBy = sort === "oldest" ? { createdAt: "asc" as const } : { createdAt: "desc" as const };
  const rows = await prisma.galleryAlbum.findMany({
    where: { schoolId },
    orderBy,
    include: { _count: { select: { images: true } }, images: { take: 1, orderBy: { createdAt: "asc" }, select: { thumbUrl: true, imageUrl: true } } },
  });
  let cards: AlbumCard[] = rows.map((a) => ({
    id: a.id, title: a.title, description: a.description,
    cover: a.coverImage ?? a.images[0]?.thumbUrl ?? a.images[0]?.imageUrl ?? null,
    photoCount: a._count.images, date: a.date?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(), isNew: Date.now() - a.createdAt.getTime() < SEVEN_DAYS,
  }));
  if (sort === "photos") cards = cards.sort((x, y) => y.photoCount - x.photoCount);
  return cards;
}

export async function getAlbum(albumId: string, schoolId: string, page = 1, pageSize = 20) {
  const album = await prisma.galleryAlbum.findFirst({ where: { id: albumId, schoolId } });
  if (!album) return null;
  const [photos, total] = await Promise.all([
    prisma.galleryImage.findMany({ where: { albumId }, orderBy: { createdAt: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.galleryImage.count({ where: { albumId } }),
  ]);
  return {
    album: { id: album.id, title: album.title, description: album.description, date: album.date?.toISOString() ?? null, coverImage: album.coverImage, photoCount: total },
    data: photos.map((p) => ({ id: p.id, thumbUrl: p.thumbUrl ?? p.imageUrl, imageUrl: p.imageUrl, caption: p.caption })),
    total, page, pageSize, hasMore: page * pageSize < total,
  };
}

export async function createAlbum(schoolId: string, input: { title: string; description?: string; date?: string }) {
  return prisma.galleryAlbum.create({ data: { title: input.title, description: input.description || null, date: input.date ? new Date(input.date) : null, schoolId } });
}

export async function updateAlbum(albumId: string, schoolId: string, input: { title?: string; description?: string; date?: string; coverImage?: string }) {
  const r = await prisma.galleryAlbum.updateMany({
    where: { id: albumId, schoolId },
    data: { ...(input.title !== undefined ? { title: input.title } : {}), ...(input.description !== undefined ? { description: input.description || null } : {}), ...(input.date !== undefined ? { date: input.date ? new Date(input.date) : null } : {}), ...(input.coverImage !== undefined ? { coverImage: input.coverImage } : {}) },
  });
  return r.count > 0;
}

// Delete the album row (cascades GalleryImage rows) AND remove the whole folder
// of files from storage in one bulk operation — no orphaned files.
export async function deleteAlbum(albumId: string, schoolId: string) {
  const album = await prisma.galleryAlbum.findFirst({ where: { id: albumId, schoolId }, select: { id: true } });
  if (!album) return false;
  await prisma.galleryAlbum.delete({ where: { id: album.id } });
  await deleteAlbumFolder(albumId);
  return true;
}

// Process + store each uploaded file (thumb + full), then create the DB rows.
export async function addPhotos(albumId: string, schoolId: string, files: File[]) {
  const album = await prisma.galleryAlbum.findFirst({ where: { id: albumId, schoolId }, select: { id: true } });
  if (!album) return null;
  const created = [];
  for (const file of files) {
    const { imageUrl, thumbUrl } = await processGalleryPhoto(file, albumId);
    const row = await prisma.galleryImage.create({ data: { albumId, imageUrl, thumbUrl } });
    created.push({ id: row.id, imageUrl, thumbUrl, caption: null });
  }
  return created;
}

export async function deletePhotos(albumId: string, schoolId: string, ids: string[]) {
  const album = await prisma.galleryAlbum.findFirst({ where: { id: albumId, schoolId }, select: { id: true } });
  if (!album) return 0;
  const rows = await prisma.galleryImage.findMany({ where: { id: { in: ids }, albumId }, select: { id: true, imageUrl: true, thumbUrl: true } });
  await prisma.galleryImage.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  await deletePhotoFiles(rows.flatMap((r) => [r.imageUrl, r.thumbUrl]));
  return rows.length;
}

export async function setPhotoCaption(photoId: string, albumId: string, schoolId: string, caption: string) {
  const album = await prisma.galleryAlbum.findFirst({ where: { id: albumId, schoolId }, select: { id: true } });
  if (!album) return false;
  const r = await prisma.galleryImage.updateMany({ where: { id: photoId, albumId }, data: { caption: caption || null } });
  return r.count > 0;
}
