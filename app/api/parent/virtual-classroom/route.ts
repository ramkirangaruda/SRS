// Parent-facing: upcoming/live virtual classes for the parent's children + any
// recordings to watch. GET /api/parent/virtual-classroom
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getParentClasses } from "@/lib/virtual-classroom";

export async function GET() {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await getParentClasses(auth.id, auth.schoolId));
}
