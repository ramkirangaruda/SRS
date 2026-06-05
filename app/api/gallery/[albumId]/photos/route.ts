// POST — upload multiple photos (multipart). Each is resized by Sharp into
// thumb + full and stored. DELETE — remove selected photos + their files.
// Principal only.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { addPhotos, deletePhotos } from "@/lib/gallery";

const MAX = 20;
const MAX_SIZE = 5 * 1024 * 1024;

export async function POST(request: Request, { params }: { params: { albumId: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  const form = await request.formData();
  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) return NextResponse.json({ error: "No files" }, { status: 400 });
  if (files.length > MAX) return NextResponse.json({ error: `Max ${MAX} photos at a time` }, { status: 400 });
  for (const f of files) {
    if (!f.type.startsWith("image/")) return NextResponse.json({ error: "Only images allowed" }, { status: 400 });
    if (f.size > MAX_SIZE) return NextResponse.json({ error: `"${f.name}" exceeds 5 MB` }, { status: 400 });
  }

  const created = await addPhotos(params.albumId, auth.schoolId, files);
  if (!created) return NextResponse.json({ error: "Album not found" }, { status: 404 });
  return NextResponse.json({ data: created }, { status: 201 });
}

export async function DELETE(request: Request, { params }: { params: { albumId: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (ids.length === 0) return NextResponse.json({ error: "No ids" }, { status: 400 });
  const count = await deletePhotos(params.albumId, auth.schoolId, ids);
  return NextResponse.json({ count });
}
