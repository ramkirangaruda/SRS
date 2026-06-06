// A teacher's personal timetable + workload stats.
// GET /api/timetable/teacher/[id]?academicYearId=
// PRINCIPAL can view any teacher; a TEACHER can view only their own.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getTeacherTimetable, activeYearId } from "@/lib/timetable";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  // A teacher may only read their own timetable.
  if (auth.role === ROLES.TEACHER && auth.id !== params.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(request.url);
  const academicYearId = searchParams.get("academicYearId") ?? (await activeYearId(auth.schoolId));
  if (!academicYearId) return NextResponse.json({ error: "No active academic year" }, { status: 400 });
  return NextResponse.json(await getTeacherTimetable(params.id, auth.schoolId, academicYearId));
}
