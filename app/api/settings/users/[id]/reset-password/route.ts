// Generate a temporary password for a user. PRINCIPAL. Returns it once to share.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { resetUserPassword } from "@/lib/settings";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const temp = await resetUserPassword(auth.schoolId, params.id);
  if (!temp) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ tempPassword: temp });
}
