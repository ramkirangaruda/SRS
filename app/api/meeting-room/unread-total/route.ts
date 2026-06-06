// Total unread message count across the user's groups (nav badge).
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { unreadTotal } from "@/lib/meeting-room";

export async function GET() {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ total: await unreadTotal(auth.id, auth.schoolId) });
}
