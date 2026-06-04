// Parent endpoint: GET the logged-in parent's own children.
// Path: /api/parent/children
//
// OWNERSHIP ENFORCEMENT: this is PARENT-only, and we pass auth.id (the parent's
// own user id) as the parentId filter. A parent therefore can only ever receive
// their own children — there's no id parameter they could tamper with to see
// someone else's.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listChildrenForParent } from "@/lib/students";

export async function GET() {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;

  const children = await listChildrenForParent(auth.id, auth.schoolId);
  return NextResponse.json({ data: children });
}
