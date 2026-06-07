// Single combined principal dashboard endpoint (all stats in one parallel pass).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { principalDashboard } from "@/lib/dashboard";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await principalDashboard(auth.schoolId));
}
