// POST — submit an assignment. Validates: OPEN, due date not passed, child is in
// the class, and hasn't already submitted (the lib enforces all of these).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { submitAssignment } from "@/lib/elearning";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  if (!body.fileUrl) return NextResponse.json({ error: "A file is required" }, { status: 422 });
  const result = await submitAssignment(params.id, auth.id, auth.schoolId, body.fileUrl);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ success: true });
}
