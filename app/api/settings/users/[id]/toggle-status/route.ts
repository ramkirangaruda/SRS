// Activate / deactivate a user. PRINCIPAL. Deactivating also blocks login.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { toggleUserStatus } from "@/lib/settings";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const active = await toggleUserStatus(auth.schoolId, params.id);
  if (active === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, active });
}
