// Leave a group (any member). Blocked if you're the last admin.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { leaveGroup, getMembership } from "@/lib/meeting-room";

export async function POST(_req: Request, { params }: { params: { groupId: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  if (!(await getMembership(params.groupId, auth.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const result = await leaveGroup(params.groupId, auth.id);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json({ ok: true });
}
