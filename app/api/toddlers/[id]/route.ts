// One toddler: PATCH (update) + DELETE. Managed by PRINCIPAL + TEACHER, scoped to
// the caller's school. Returns 404 (not 500) when the id isn't in this school.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { updateToddler, deleteToddler } from "@/lib/toddlers";
import { toddlerSchema } from "@/lib/validations/toddler";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = toddlerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const toddler = await updateToddler(params.id, parsed.data, auth.schoolId);
  if (!toddler) return NextResponse.json({ error: "Toddler not found" }, { status: 404 });
  return NextResponse.json(toddler);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const ok = await deleteToddler(params.id, auth.schoolId);
  if (!ok) return NextResponse.json({ error: "Toddler not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
