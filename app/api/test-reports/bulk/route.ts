// POST — bulk upsert marks for a test (one transaction, grade+percentage stored).
// DELETE — remove all results for a test/class/subject. PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { bulkUpsertTestReports, deleteTest } from "@/lib/test-reports";

export async function POST(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const b = await request.json().catch(() => ({}));
  if (!b.classId || !b.sectionId || !b.subjectId || !b.testName || !b.date || !b.totalMarks || !Array.isArray(b.records))
    return NextResponse.json({ error: "Missing test details" }, { status: 422 });
  // Validate marks never exceed the total.
  for (const r of b.records) if (r.obtainedMarks > b.totalMarks) return NextResponse.json({ error: "Some marks exceed the total" }, { status: 422 });
  const result = await bulkUpsertTestReports({ schoolId: auth.schoolId, ...b });
  return NextResponse.json(result, { status: 201 });
}

export async function DELETE(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const b = await request.json().catch(() => ({}));
  if (!b.classId || !b.sectionId || !b.subjectId || !b.testName || !b.date) return NextResponse.json({ error: "Missing test details" }, { status: 422 });
  const count = await deleteTest({ schoolId: auth.schoolId, ...b });
  return NextResponse.json({ count });
}
