// Enquiry category: PUT (rename) + DELETE. PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { updateCategory, deleteCategory } from "@/lib/enquiry";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const name = (body as { name?: string }).name?.trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 422 });
  const c = await updateCategory(params.id, name, auth.schoolId);
  if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(c);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const ok = await deleteCategory(params.id, auth.schoolId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
