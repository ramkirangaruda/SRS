// PATCH — mark a broadcast read for the CURRENT user. Any authenticated user
// (they can only ever flip their own recipient row).
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { markBroadcastRead } from "@/lib/broadcast";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  const changed = await markBroadcastRead(params.id, auth.id);
  return NextResponse.json({ success: true, changed });
}
