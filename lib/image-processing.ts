// Server-side image processing with Sharp. THE PIPELINE: on upload we generate
// TWO versions of each photo and store both:
//   • thumb_  → resized to 300px wide  (the grid uses this — tiny, loads fast)
//   • full_   → resized to max 1920px  (the lightbox uses this — still far
//                smaller than a 4000px phone photo)
// We also convert to WebP (~30% smaller than JPEG) and auto-rotate via EXIF.
// WHY TWO VERSIONS: a 40-photo grid downloads ~2MB of thumbnails instead of
// ~150MB of originals; the full version is fetched only when a photo is opened.
// (In production these go to Supabase Storage and are served from its CDN; here
// we write to public/ behind the same function so the swap is localized.)
import sharp from "sharp";
import { mkdir, rm } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

const PUBLIC_DIR = path.join(process.cwd(), "public");

export type ProcessedImage = { imageUrl: string; thumbUrl: string };

export async function processGalleryPhoto(file: File, albumId: string): Promise<ProcessedImage> {
  const input = Buffer.from(await file.arrayBuffer());
  const base = `${Date.now()}-${randomBytes(3).toString("hex")}`;
  const dir = path.join(PUBLIC_DIR, "gallery", albumId);
  await mkdir(dir, { recursive: true });

  const fullName = `full_${base}.webp`;
  await sharp(input).rotate().resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 82 }).toFile(path.join(dir, fullName));

  const thumbName = `thumb_${base}.webp`;
  await sharp(input).rotate().resize({ width: 300, withoutEnlargement: true }).webp({ quality: 75 }).toFile(path.join(dir, thumbName));

  return { imageUrl: `/gallery/${albumId}/${fullName}`, thumbUrl: `/gallery/${albumId}/${thumbName}` };
}

// Delete an entire album folder in one go. (Supabase equivalent: list objects by
// the `gallery/{albumId}/` prefix, then remove() them in a batch.)
export async function deleteAlbumFolder(albumId: string) {
  await rm(path.join(PUBLIC_DIR, "gallery", albumId), { recursive: true, force: true });
}

// Delete specific photo files (full + thumb) by their public URLs.
export async function deletePhotoFiles(urls: (string | null | undefined)[]) {
  await Promise.all(
    urls.filter((u): u is string => !!u && u.startsWith("/gallery/")).map(async (u) => {
      try { await rm(path.join(PUBLIC_DIR, u)); } catch { /* already gone */ }
    })
  );
}
