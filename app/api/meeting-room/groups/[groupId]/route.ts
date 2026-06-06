// One group: GET info (members), PUT update (PRINCIPAL), DELETE soft-delete (PRINCIPAL).
import { NextResponse } from "next/server";
import { requireAnyRole, requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getGroupInfo, getMembership, updateGroup, deleteGroup } from "@/lib/meeting-room";
import { groupUpdateSchema } from "@/lib/validations/meeting-room";

export async function GET(_req: Request, { params }: { params: { groupId: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  // Must be an active member to see group info.
  if (!(await getMembership(params.groupId, auth.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const info = await getGroupInfo(params.groupId, auth.schoolId);
  if (!info) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(info);
}

export async function PUT(request: Request, { params }: { params: { groupId: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = groupUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const ok = await updateGroup(params.groupId, auth.schoolId, parsed.data);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: { groupId: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const ok = await deleteGroup(params.groupId, auth.schoolId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
