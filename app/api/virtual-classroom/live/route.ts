// Classes that are LIVE right now. PRINCIPAL or TEACHER. Polled by the UI so the
// LIVE badge appears without a page refresh.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listLive } from "@/lib/virtual-classroom";

export async function GET() {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ items: await listLive(auth.schoolId) });
}
