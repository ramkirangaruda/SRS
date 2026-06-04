// GET /api/parent/fees — fee data for the logged-in parent's children only.
// Ownership is enforced by passing the parent's own id to getChildrenFees.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getChildrenFees } from "@/lib/fees";

export async function GET() {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const data = await getChildrenFees(auth.id, auth.schoolId);
  return NextResponse.json({ data });
}
