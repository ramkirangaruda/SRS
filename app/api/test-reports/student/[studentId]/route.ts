// GET — all of one student's test scores across subjects (chronological).
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getStudentScores, getStudentChart } from "@/lib/test-reports";

export async function GET(request: Request, { params }: { params: { studentId: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const [scores, chart] = await Promise.all([getStudentScores(params.studentId, auth.schoolId), getStudentChart(params.studentId, auth.schoolId)]);
  return NextResponse.json({ scores, chart });
}
