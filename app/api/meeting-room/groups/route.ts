// Groups list (any staff) + create group (PRINCIPAL only).
import { NextResponse } from "next/server";
import { requireAnyRole, requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listGroups, createGroup } from "@/lib/meeting-room";
import { groupCreateSchema } from "@/lib/validations/meeting-room";

export async function GET() {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ groups: await listGroups(auth.id, auth.schoolId) });
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = groupCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const group = await createGroup({ ...parsed.data, createdById: auth.id, schoolId: auth.schoolId });
  return NextResponse.json({ id: group.id }, { status: 201 });
}
