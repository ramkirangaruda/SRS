// GET /api/parent/attendance/[studentId]?month=&year= — one child's monthly
// attendance, PARENT only. getChildAttendanceDetail filters by the parent's own
// id, so a parent can only read their own child's attendance (else 404).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getChildAttendanceDetail } from "@/lib/attendance";

export async function GET(request: Request, { params }: { params: { studentId: string } }) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getUTCFullYear();
  const month = Number(searchParams.get("month")) || now.getUTCMonth() + 1;

  const data = await getChildAttendanceDetail(params.studentId, auth.id, auth.schoolId, year, month);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
