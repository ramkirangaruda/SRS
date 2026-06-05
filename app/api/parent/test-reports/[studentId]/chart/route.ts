// GET — per-subject trend series for a child (ownership enforced). Used by the
// line chart. We confirm the student belongs to this parent before returning.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getStudentChart, getStudentScores } from "@/lib/test-reports";

export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const owns = await prisma.student.findFirst({ where: { id: params.studentId, parentId: auth.id, schoolId: auth.schoolId }, select: { id: true } });
  if (!owns) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [chart, scores] = await Promise.all([getStudentChart(params.studentId, auth.schoolId), getStudentScores(params.studentId, auth.schoolId)]);
  return NextResponse.json({ chart, scores });
}
