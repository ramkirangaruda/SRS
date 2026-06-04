// GET /api/fees/summary — school-wide fee totals (principal only).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getFeeSummary } from "@/lib/fees";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const summary = await getFeeSummary(auth.schoolId);
  return NextResponse.json(summary);
}
