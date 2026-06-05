// GET — list reports with filters (classId, term, academicYearId, status).
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listReports } from "@/lib/progress-reports";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const sp = new URL(request.url).searchParams;
  return NextResponse.json({ data: await listReports(auth.schoolId, { classId: sp.get("classId") ?? undefined, term: sp.get("term") ?? undefined, academicYearId: sp.get("academicYearId") ?? undefined, status: sp.get("status") ?? undefined }) });
}
