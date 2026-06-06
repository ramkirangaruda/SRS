// Server-side file storage utility. This is our STORAGE ABSTRACTION: the rest of
// the app calls saveUploadedFile()/deleteUploadedFile() and doesn't care HOW or
// WHERE bytes are stored. Today it's the local `public/` folder (great for dev);
// swapping to Supabase Storage / S3 later means rewriting ONLY this file (and
// returning presigned URLs) — callers stay unchanged.
import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { validateFileMeta, type StoredFile } from "@/lib/upload-constants";

// Re-exported so existing importers of lib/upload keep working.
export type { StoredFile };

// Only these subfolders may be written to — prevents a crafted "folder" value
// from escaping into the filesystem (path traversal).
const ALLOWED_FOLDERS = new Set(["uploads", "homework-attachments", "videos", "submissions", "meeting-files", "resources", "planners"]);

const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100 MB for direct video uploads

const PUBLIC_DIR = path.join(process.cwd(), "public");

// Save one uploaded file and return its public URL + metadata.
//
// HOW THE UPLOAD "STREAMS" IN: the browser sends the file inside a
// multipart/form-data body. Next parses it into a Web `File`; file.arrayBuffer()
// pulls the bytes into a Buffer we write to disk. (Object-storage SDKs accept the
// stream directly, so they never hold the whole file in memory — that's the
// production win.)
export async function saveUploadedFile(file: File, folder: string): Promise<StoredFile> {
  if (!ALLOWED_FOLDERS.has(folder)) {
    throw new Error("Invalid upload folder");
  }
  // Video uploads have their own rules (video mime, 100 MB); everything else
  // uses the standard image/doc validation.
  if (folder === "videos") {
    if (!file.type.startsWith("video/")) throw new Error("Only video files are allowed");
    if (file.size > MAX_VIDEO_SIZE) throw new Error("Video exceeds 100 MB");
  } else {
    const err = validateFileMeta({ name: file.name, size: file.size, type: file.type });
    if (err) throw new Error(err);
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Unique, sanitized filename so two "notes.pdf" uploads never collide.
  const safe = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const fileName = `${Date.now()}-${randomBytes(4).toString("hex")}-${safe}`;

  const dir = path.join(PUBLIC_DIR, folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, fileName), buffer);

  return {
    url: `/${folder}/${fileName}`, // files in public/ are served at the site root
    name: file.name,
    size: file.size,
    type: file.type || "application/octet-stream",
  };
}

// Delete a previously stored file by its public URL. Used when an attachment is
// removed during edit, or when homework is permanently deleted — this is what
// prevents "orphaned files" (bytes left in storage with no DB row pointing at
// them, silently wasting space). We re-validate the path stays inside an allowed
// folder before unlinking.
export async function deleteUploadedFile(url: string): Promise<void> {
  if (!url.startsWith("/")) return;
  const rel = url.replace(/^\//, ""); // "homework-attachments/123-file.pdf"
  const folder = rel.split("/")[0];
  if (!ALLOWED_FOLDERS.has(folder)) return;

  const target = path.join(PUBLIC_DIR, rel);
  // Safety: ensure the resolved path is still under PUBLIC_DIR.
  if (!target.startsWith(PUBLIC_DIR)) return;

  try {
    await unlink(target);
  } catch {
    // Already gone / never existed — fine. Deleting is best-effort.
  }
}
