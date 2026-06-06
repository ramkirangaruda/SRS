// Prefill payload from an enquiry (for "convert to admission"). PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { enquiryPrefill } from "@/lib/admissions";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const enquiryId = new URL(request.url).searchParams.get("enquiryId");
  if (!enquiryId) return NextResponse.json({ error: "enquiryId required" }, { status: 400 });
  const data = await enquiryPrefill(enquiryId, auth.schoolId);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
