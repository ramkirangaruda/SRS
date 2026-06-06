// Parent-facing staff directory: teachers only, contact gated by school setting.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getParentStaff } from "@/lib/staff";

export async function GET() {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await getParentStaff(auth.schoolId));
}
