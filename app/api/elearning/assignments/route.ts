// Assignments: GET (list, filter category/class/status) + POST (create).
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listAssignments, createAssignment } from "@/lib/elearning";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  const sp = new URL(request.url).searchParams;
  return NextResponse.json({ data: await listAssignments(auth.schoolId, { categoryId: sp.get("categoryId") ?? undefined, classId: sp.get("classId") ?? undefined, status: sp.get("status") ?? undefined }) });
}
export async function POST(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  if (!body.title || !body.dueDate) return NextResponse.json({ error: "Title and due date are required" }, { status: 422 });
  const a = await createAssignment(auth.schoolId, auth.id, body);
  return NextResponse.json({ id: a.id }, { status: 201 });
}
