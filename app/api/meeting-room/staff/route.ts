// Staff list for the create-group / add-members picker. PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listStaffForPicker } from "@/lib/meeting-room";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ staff: await listStaffForPicker(auth.schoolId) });
}
