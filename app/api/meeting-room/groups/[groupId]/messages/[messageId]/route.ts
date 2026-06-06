// Soft-delete your OWN message. (deleteMessage enforces sender ownership.)
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getMembership, deleteMessage } from "@/lib/meeting-room";

export async function DELETE(_req: Request, { params }: { params: { groupId: string; messageId: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  if (!(await getMembership(params.groupId, auth.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const ok = await deleteMessage(params.messageId, auth.id);
  if (!ok) return NextResponse.json({ error: "Can only delete your own message" }, { status: 403 });
  return NextResponse.json({ ok: true });
}
