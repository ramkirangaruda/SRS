// Approve an application — atomic Student + Parent creation. Returns the new
// admission number and (for a brand-new parent) one-time login credentials.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { approveApplication } from "@/lib/admissions";
import { approveSchema } from "@/lib/validations/admissions";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = approveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const result = await approveApplication(params.id, auth.schoolId, auth.id, parsed.data);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json(result);
}
