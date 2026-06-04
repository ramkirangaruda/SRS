// GET /api/attendance/student/[studentId]?month=&year= — one student's monthly
// attendance + stats. PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getStudentAttendance } from "@/lib/attendance";

export async function GET(request: Request, { params }: { params: { studentId: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getUTCFullYear();
  const month = Number(searchParams.get("month")) || now.getUTCMonth() + 1;

  const data = await getStudentAttendance(params.studentId, auth.schoolId, year, month);
  if (!data) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  return NextResponse.json(data);
}
