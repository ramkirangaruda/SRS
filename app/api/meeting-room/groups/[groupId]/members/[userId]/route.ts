// Remove a member (soft) — PRINCIPAL only. Their messages remain visible.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { removeMember } from "@/lib/meeting-room";

export async function DELETE(_req: Request, { params }: { params: { groupId: string; userId: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const ok = await removeMember(params.groupId, auth.schoolId, params.userId, auth.id);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
