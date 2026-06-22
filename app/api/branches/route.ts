// GET /api/branches — list this school's branches (with their enabled modules)
// for the Settings → Branches manager. PRINCIPAL only.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listBranches } from "@/lib/branches";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const branches = await listBranches(auth.schoolId);
  return NextResponse.json({ branches });
}
