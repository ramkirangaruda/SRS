// Batch upload: accepts multiple files in one multipart request, saves each, and
// creates a resource per file (title auto-derived from the filename).
//
// BATCH FILE PROCESSING: the form carries many `file` entries under the same key
// plus shared metadata (subjectId/type). We save the files concurrently
// (Promise.all), collect the stored metadata, then do ONE createMany insert. If a
// single file fails validation we skip it and report how many succeeded.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { saveUploadedFile } from "@/lib/upload";
import { batchCreateResources, RESOURCE_TYPES } from "@/lib/planners";

export async function POST(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;

  const form = await request.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "No files" }, { status: 400 });

  const subjectId = (form.get("subjectId") as string) || null;
  const typeRaw = (form.get("type") as string) || "DOCUMENT";
  const type = (RESOURCE_TYPES as readonly string[]).includes(typeRaw) ? typeRaw : "DOCUMENT";
  const isPublic = form.get("isPublic") === "true";

  const saved: { fileUrl: string; fileName: string; fileSize: number; fileType: string }[] = [];
  const results = await Promise.allSettled(files.map((f) => saveUploadedFile(f, "resources")));
  for (const r of results) {
    if (r.status === "fulfilled") saved.push({ fileUrl: r.value.url, fileName: r.value.name, fileSize: r.value.size, fileType: r.value.type });
  }
  if (saved.length === 0) return NextResponse.json({ error: "All files were rejected" }, { status: 400 });

  const created = await batchCreateResources(saved, { subjectId, type, isPublic }, auth.schoolId, auth.id);
  return NextResponse.json({ created, skipped: files.length - saved.length }, { status: 201 });
}
