// Regenerate the invite code (invalidates the old one). PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { regenerateInviteCode } from "@/lib/settings";

export async function POST() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ code: await regenerateInviteCode(auth.schoolId) });
}
