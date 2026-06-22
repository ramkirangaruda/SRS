// PARENT view: GET only the toddlers linked to the logged-in parent. Scoped by
// parentId AND schoolId so a parent can only ever see their own child.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listToddlersForParent } from "@/lib/toddlers";

export async function GET() {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const toddlers = await listToddlersForParent(auth.id, auth.schoolId);
  return NextResponse.json({ toddlers });
}
