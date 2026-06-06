// Enquiry funnel + source breakdown + monthly trend. PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { enquiryStats } from "@/lib/enquiry";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await enquiryStats(auth.schoolId));
}
