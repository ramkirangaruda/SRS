// Upload rules shared by the CLIENT (instant feedback) and the SERVER (the
// authoritative check). Validating only on the client is unsafe — anyone can
// POST to /api/upload directly — so lib/upload.ts re-checks these on the server.
// No Node/Prisma imports here, so client components can import it freely.

// Attachment metadata persisted in the DB (NOT the bytes — those go to storage).
// Defined here (client-safe) so both client and server can share the type.
export type StoredFile = { url: string; name: string; size: number; type: string };

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB per file
export const MAX_FILES = 5; // per homework

// Allowed MIME types. Images plus common document formats.
export const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
]);

// Fallback extension allowlist (some browsers send an empty MIME type).
const ALLOWED_EXT = new Set([
  "png", "jpg", "jpeg", "gif", "webp", "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt",
]);

export function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i + 1).toLowerCase() : "";
}

// Returns an error message, or null if the file is acceptable. Used on both ends.
export function validateFileMeta(meta: { name: string; size: number; type: string }): string | null {
  if (meta.size > MAX_FILE_SIZE) {
    return `"${meta.name}" is larger than ${MAX_FILE_SIZE / 1024 / 1024} MB.`;
  }
  const typeOk = meta.type && ALLOWED_MIME.has(meta.type);
  const extOk = ALLOWED_EXT.has(extOf(meta.name));
  if (!typeOk && !extOk) {
    return `"${meta.name}" is not an allowed file type.`;
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// A coarse "kind" used to choose an icon for an attachment.
export type FileKind = "image" | "pdf" | "doc" | "sheet" | "slide" | "file";
export function fileKind(nameOrType: string): FileKind {
  const s = nameOrType.toLowerCase();
  if (s.includes("image") || /\.(png|jpe?g|gif|webp)$/.test(s)) return "image";
  if (s.includes("pdf") || s.endsWith(".pdf")) return "pdf";
  if (s.includes("word") || /\.(docx?)$/.test(s)) return "doc";
  if (s.includes("sheet") || s.includes("excel") || /\.(xlsx?)$/.test(s)) return "sheet";
  if (s.includes("presentation") || s.includes("powerpoint") || /\.(pptx?)$/.test(s)) return "slide";
  return "file";
}
