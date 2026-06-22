// Remove an enrollment. DELETE. PRINCIPAL + TEACHER, scoped via the batch's school.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { unenrollStudent } from "@/lib/tuitions";

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const ok = await unenrollStudent(params.id, auth.schoolId);
  if (!ok) return NextResponse.json({ error: "Enrollment not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
