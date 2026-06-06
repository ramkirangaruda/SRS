// Add a note / log a call / set a follow-up WITHOUT changing status.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { addActivity } from "@/lib/enquiry";
import { activitySchema } from "@/lib/validations/enquiry";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = activitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const ok = await addActivity(params.id, auth.schoolId, auth.id, parsed.data.activityType, parsed.data.note, parsed.data.followUpDate);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
