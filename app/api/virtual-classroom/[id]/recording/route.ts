// Attach/replace a recording link for a finished class. PRINCIPAL or TEACHER.
// PUT /api/virtual-classroom/[id]/recording
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { setRecording } from "@/lib/virtual-classroom";
import { recordingSchema } from "@/lib/validations/virtual-classroom";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = recordingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const item = await setRecording(params.id, parsed.data.recordingUrl || null, auth.schoolId);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}
