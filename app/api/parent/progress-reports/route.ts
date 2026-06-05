// GET — PUBLISHED reports for the parent's children only.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { parentReports } from "@/lib/progress-reports";

export async function GET() {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ data: await parentReports(auth.id, auth.schoolId) });
}
