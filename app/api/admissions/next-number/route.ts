// Preview the next admission number (no write). PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { computeNextNumber } from "@/lib/admissions";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ next: await computeNextNumber(auth.schoolId) });
}
