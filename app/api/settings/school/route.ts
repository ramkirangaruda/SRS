// Update school profile (name, contact, logo, affiliation). PRINCIPAL.
// The logo is uploaded separately via /api/upload; here we just store its URL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getSchoolProfile, updateSchoolProfile } from "@/lib/settings";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await getSchoolProfile(auth.schoolId));
}

export async function PUT(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!(body as { name?: string }).name?.trim()) return NextResponse.json({ error: "School name is required" }, { status: 422 });
  await updateSchoolProfile(auth.schoolId, body as Record<string, unknown>);
  return NextResponse.json({ ok: true });
}
