// Single visitor: PUT (edit) + DELETE. PRINCIPAL only.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { updateVisitor, deleteVisitor } from "@/lib/visitors";
import { visitorUpdateSchema } from "@/lib/validations/visitors";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = visitorUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const v = await updateVisitor(params.id, parsed.data, auth.schoolId);
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(v);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const ok = await deleteVisitor(params.id, auth.schoolId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
