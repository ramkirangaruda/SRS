// Admission pipeline counts, approval rate, class breakdown, monthly trend.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { admissionStats } from "@/lib/admissions";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await admissionStats(auth.schoolId));
}
