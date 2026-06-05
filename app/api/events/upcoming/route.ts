// GET — next 30 days of events (expanded). Any authenticated user.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listUpcoming } from "@/lib/events";

export async function GET() {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  const data = await listUpcoming(auth.schoolId, 30);
  return NextResponse.json({ data });
}
