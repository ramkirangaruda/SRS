// Parent-facing timetable: a child's class/section grid for the active year.
// GET /api/parent/timetable?studentId=
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getParentTimetable } from "@/lib/timetable";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId") ?? undefined;
  return NextResponse.json(await getParentTimetable(auth.id, auth.schoolId, studentId));
}
