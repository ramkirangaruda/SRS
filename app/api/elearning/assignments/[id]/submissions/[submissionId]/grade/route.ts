// PATCH — grade a submission (marks + feedback).
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { gradeSubmission } from "@/lib/elearning";

export async function PATCH(request: Request, { params }: { params: { submissionId: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  const ok = await gradeSubmission(params.submissionId, auth.schoolId, body.grade ?? "", body.feedback ?? "");
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
