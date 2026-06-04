// GET /api/attendance/daily?date=&classId=&sectionId= — the roster for a day,
// pre-filled with any existing records. PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getDailyAttendance } from "@/lib/attendance";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const classId = searchParams.get("classId");
  const sectionId = searchParams.get("sectionId");
  if (!date || !classId || !sectionId) {
    return NextResponse.json({ error: "date, classId and sectionId are required" }, { status: 400 });
  }

  const data = await getDailyAttendance(auth.schoolId, classId, sectionId, date);
  return NextResponse.json(data);
}
