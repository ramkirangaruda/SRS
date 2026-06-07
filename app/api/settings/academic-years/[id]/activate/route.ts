// Set an academic year active (updates School.activeAcademicYear). PRINCIPAL.
// Returns { isPast } so the UI can warn when activating a year already ended.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { activateAcademicYear } from "@/lib/settings";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const result = await activateAcademicYear(auth.schoolId, params.id);
  if (!result) return NextResponse.json({ error: "Year not found" }, { status: 404 });
  return NextResponse.json({ ok: true, ...result });
}
