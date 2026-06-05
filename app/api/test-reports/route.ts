// GET — results for a test (with computed competition rank).
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listResults } from "@/lib/test-reports";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const sp = new URL(request.url).searchParams;
  const data = await listResults({
    schoolId: auth.schoolId,
    classId: sp.get("classId") ?? undefined, sectionId: sp.get("sectionId") ?? undefined,
    subjectId: sp.get("subjectId") ?? undefined, testName: sp.get("testName") ?? undefined,
    startDate: sp.get("startDate") ?? undefined, endDate: sp.get("endDate") ?? undefined,
  });
  return NextResponse.json({ data });
}
