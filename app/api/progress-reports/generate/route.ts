// POST — create a ProgressReport (DRAFT) per student with the snapshot + remarks.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { generateReports } from "@/lib/progress-reports";

export async function POST(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const b = await request.json().catch(() => ({}));
  if (!b.classId || !b.sectionId || !b.academicYearId || !b.term) return NextResponse.json({ error: "classId, sectionId, academicYearId, term required" }, { status: 422 });
  const result = await generateReports({ schoolId: auth.schoolId, classId: b.classId, sectionId: b.sectionId, academicYearId: b.academicYearId, term: b.term, perStudent: b.perStudent ?? {} });
  return NextResponse.json(result, { status: 201 });
}
