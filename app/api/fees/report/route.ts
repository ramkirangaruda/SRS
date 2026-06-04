// GET /api/fees/report — class-wise aggregated fee data (principal only).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getClassReport } from "@/lib/fees";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const rows = await getClassReport(auth.schoolId);
  return NextResponse.json({ data: rows });
}
