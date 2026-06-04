// GET /api/attendance/report?start=&end=&classId=&sectionId=&format=
// Returns the student-wise grid for a date range. With format=csv it streams a
// downloadable CSV instead of JSON. PRINCIPAL or TEACHER.
//
// HOW FILE DOWNLOADS WORK FROM AN API: a download is just an HTTP response with
// two special headers — Content-Type: text/csv tells the browser the body is a
// CSV, and Content-Disposition: attachment; filename="..." tells it to SAVE the
// body to a file (with that name) instead of displaying it. The body is the raw
// CSV text. The browser handles the rest.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getAttendanceReport, buildReportCsv } from "@/lib/attendance";

// Default range = the current month (1st .. today).
function defaultRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const end = now.toISOString().slice(0, 10);
  return { start, end };
}

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const def = defaultRange();
  const startStr = searchParams.get("start") || def.start;
  const endStr = searchParams.get("end") || def.end;
  const classId = searchParams.get("classId") || undefined;
  const sectionId = searchParams.get("sectionId") || undefined;
  const format = searchParams.get("format");

  const report = await getAttendanceReport({ schoolId: auth.schoolId, classId, sectionId, startStr, endStr });

  if (format === "csv") {
    const csv = buildReportCsv(report);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance-${startStr}-to-${endStr}.csv"`,
      },
    });
  }

  return NextResponse.json(report);
}
