// Visitor analytics for the month. PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { visitorStats } from "@/lib/visitors";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await visitorStats(auth.schoolId));
}
