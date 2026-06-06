// Whole-school conflict report for a year. PRINCIPAL only.
// GET /api/timetable/conflicts?academicYearId=
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listConflicts, activeYearId } from "@/lib/timetable";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get("academicYearId") ?? (await activeYearId(auth.schoolId));
  if (!academicYearId) return NextResponse.json({ conflicts: [] });
  return NextResponse.json({ conflicts: await listConflicts(auth.schoolId, academicYearId) });
}
