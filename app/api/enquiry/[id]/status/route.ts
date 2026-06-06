// Move an enquiry through the pipeline. Writes a STATUS_CHANGE activity. When
// moving to CONVERTED we return the data needed to pre-fill the admission form.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { changeStatus, getEnquiry } from "@/lib/enquiry";
import { statusChangeSchema } from "@/lib/validations/enquiry";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = statusChangeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const updated = await changeStatus(params.id, auth.schoolId, parsed.data.toStatus, auth.id, { note: parsed.data.note, followUpDate: parsed.data.followUpDate, closureReason: parsed.data.closureReason });
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // CONVERTED → hand back the prefill payload for the admission form.
  if (parsed.data.toStatus === "CONVERTED") {
    const e = await getEnquiry(params.id, auth.schoolId);
    return NextResponse.json({ ok: true, prefill: e ? { enquiryId: e.id, studentName: e.childName, parentName: e.parentName, phone: e.phone, email: e.email, classAppliedFor: e.classInterestedIn, gender: e.childGender, previousSchool: e.currentSchool, address: e.address } : null });
  }
  return NextResponse.json({ ok: true });
}
