// A minimal file-upload endpoint for student photos.
// Path: /api/upload  (POST, multipart/form-data with a "file" field)
//
// For Phase 1–3 (local dev) we save uploads to /public/uploads and return their
// public URL (e.g. "/uploads/162534-photo.png"). In production you'd swap this
// for object storage (S3, etc.), but the contract — "POST a file, get back a
// URL" — stays the same. Only principals upload student photos.
import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  const formData = await request.formData();
  const file = formData.get("file");

  // formData values are either a File or a string; we need a File.
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Basic guards: images only, max 5 MB.
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 400 });
  }

  // Read the file into a Buffer we can write to disk.
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Make a safe, unique filename: timestamp + sanitized original name.
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true }); // ensure the folder exists
  await writeFile(path.join(uploadDir, fileName), buffer);

  // The public URL the browser can use (files in /public are served at root).
  return NextResponse.json({ url: `/uploads/${fileName}` }, { status: 201 });
}
