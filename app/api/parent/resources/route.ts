// Parent-facing: public (shared) resources only, read-only.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listPublicResources } from "@/lib/planners";

export async function GET() {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ resources: await listPublicResources(auth.schoolId) });
}
