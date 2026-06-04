// POST /api/upload — generic single-file upload (multipart/form-data).
// Fields: "file" (required), "folder" (optional, default "uploads").
// Returns the stored file's { url, name, size, type }.
//
// WHY A SEPARATE UPLOAD ENDPOINT (not part of homework create): uploading bytes
// is slow and independent of the form. By uploading each file here as soon as
// it's picked, the homework form only ever submits tiny JSON (the returned URLs),
// stays responsive, can show per-file progress, and lets the user remove a file
// without re-uploading the rest. See the walkthrough for the full rationale.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { saveUploadedFile } from "@/lib/upload";

export async function POST(request: Request) {
  // Both principals and teachers upload (student photos, homework attachments).
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;

  const formData = await request.formData();
  const file = formData.get("file");
  const folder = (formData.get("folder") as string) || "uploads";

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  try {
    const stored = await saveUploadedFile(file, folder);
    return NextResponse.json(stored, { status: 201 });
  } catch (e) {
    // saveUploadedFile throws on bad type/size/folder — surface as a 400.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upload failed" },
      { status: 400 }
    );
  }
}
