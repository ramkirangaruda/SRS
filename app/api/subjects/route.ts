// Subjects lookup for dropdowns. GET /api/subjects?classId= → subjects of that
// class (or all school subjects if no classId). PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listSubjectsForClass } from "@/lib/timetable";
import { listSubjects } from "@/lib/homework";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const subjects = classId
    ? await listSubjectsForClass(auth.schoolId, classId)
    : await listSubjects(auth.schoolId);
  return NextResponse.json({ subjects });
}
