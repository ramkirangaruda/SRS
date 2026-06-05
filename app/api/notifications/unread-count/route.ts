// GET — unread message + diary counts for the current user (drives the nav
// badges). Both are index-backed COUNTs, so this is cheap to poll.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getUnreadCounts } from "@/lib/notifications";

export async function GET() {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  const counts = await getUnreadCounts({ id: auth.id, role: auth.role, schoolId: auth.schoolId });
  return NextResponse.json(counts);
}
