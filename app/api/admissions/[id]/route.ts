// Single application: GET (with timeline) + PUT (edit). PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getAdmission, updateApplication } from "@/lib/admissions";
import { admissionCreateSchema } from "@/lib/validations/admissions";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const a = await getAdmission(params.id, auth.schoolId);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(a);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = admissionCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const a = await updateApplication(params.id, parsed.data, auth.schoolId);
  if (!a) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
