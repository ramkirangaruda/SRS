// GET — subject-wise latest scores + trend for the parent's children.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getParentScores } from "@/lib/test-reports";

export async function GET() {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ data: await getParentScores(auth.id, auth.schoolId) });
}
