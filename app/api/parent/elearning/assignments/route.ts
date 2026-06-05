// Assignments for the parent's children's classes, with this child's submission status.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { parentAssignments } from "@/lib/elearning";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const categoryId = new URL(request.url).searchParams.get("categoryId") ?? undefined;
  return NextResponse.json({ data: await parentAssignments(auth.id, auth.schoolId, categoryId) });
}
