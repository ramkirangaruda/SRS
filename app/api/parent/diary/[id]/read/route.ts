// PATCH — mark a diary entry read for the current parent (idempotent upsert).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { markDiaryRead } from "@/lib/diary";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const ok = await markDiaryRead(params.id, auth.id, auth.schoolId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
