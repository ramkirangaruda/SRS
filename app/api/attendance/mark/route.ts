// POST /api/attendance/mark — save a whole class's attendance in ONE transaction.
// Allowed for PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { markAttendance, AttendanceError } from "@/lib/attendance";
import { markAttendanceSchema } from "@/lib/validations/attendance";

export async function POST(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = markAttendanceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const result = await markAttendance({
      schoolId: auth.schoolId,
      markedById: auth.id,
      classId: parsed.data.classId,
      sectionId: parsed.data.sectionId,
      dateStr: parsed.data.date,
      records: parsed.data.records,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    if (e instanceof AttendanceError && e.code === "INVALID_STUDENTS") {
      return NextResponse.json({ error: e.message }, { status: 422 });
    }
    console.error("Mark attendance failed:", e);
    return NextResponse.json({ error: "Failed to mark attendance" }, { status: 500 });
  }
}
