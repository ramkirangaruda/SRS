// GET /api/fees/students/[studentId] — one student's fee structure + payment
// history with running balance (principal only).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getStudentFeeDetail } from "@/lib/fees";

export async function GET(_request: Request, { params }: { params: { studentId: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  const detail = await getStudentFeeDetail(params.studentId, auth.schoolId);
  if (!detail) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  return NextResponse.json(detail);
}
