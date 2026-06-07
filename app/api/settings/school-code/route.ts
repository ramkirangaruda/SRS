// Get (or lazily create) the school's invite code. PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getOrCreateInviteCode } from "@/lib/settings";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ code: await getOrCreateInviteCode(auth.schoolId) });
}
