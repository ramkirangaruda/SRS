// Timetable grid endpoints.
//   GET /api/timetable?classId=&sectionId=&academicYearId= → the grid
//   PUT /api/timetable → write one cell (subject + teacher), with conflict check
// PRINCIPAL builds timetables; TEACHER can read (their own view uses /teacher/*).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getTimetable, setEntry, activeYearId } from "@/lib/timetable";
import { entrySchema } from "@/lib/validations/timetable";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const classId = searchParams.get("classId");
  const sectionId = searchParams.get("sectionId");
  const academicYearId = searchParams.get("academicYearId") ?? (await activeYearId(auth.schoolId));
  if (!classId || !sectionId || !academicYearId) {
    return NextResponse.json({ error: "classId, sectionId and academicYearId are required" }, { status: 400 });
  }
  return NextResponse.json(await getTimetable(auth.schoolId, classId, sectionId, academicYearId));
}

export async function PUT(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = entrySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const result = await setEntry({
    schoolId: auth.schoolId,
    classId: parsed.data.classId,
    sectionId: parsed.data.sectionId,
    academicYearId: parsed.data.academicYearId,
    dayOfWeek: parsed.data.dayOfWeek,
    periodNumber: parsed.data.periodNumber,
    subjectId: parsed.data.subjectId ?? null,
    teacherId: parsed.data.teacherId ?? null,
  });
  // 409 Conflict is the correct HTTP status for "this clashes with existing data".
  if (!result.ok) return NextResponse.json({ error: "Teacher double-booked", conflict: result.conflict }, { status: 409 });
  return NextResponse.json({ ok: true });
}
