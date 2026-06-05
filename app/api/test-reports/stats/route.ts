// GET — class statistics for a test (avg/high/low/pass%/grade distribution).
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getStats } from "@/lib/test-reports";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const sp = new URL(request.url).searchParams;
  return NextResponse.json(await getStats({ schoolId: auth.schoolId, classId: sp.get("classId") ?? undefined, sectionId: sp.get("sectionId") ?? undefined, subjectId: sp.get("subjectId") ?? undefined, testName: sp.get("testName") ?? undefined }));
}
