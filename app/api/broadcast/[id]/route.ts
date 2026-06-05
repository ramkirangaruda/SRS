// GET (single broadcast + read receipts) + DELETE (soft delete). PRINCIPAL only.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getBroadcastById, softDeleteBroadcast } from "@/lib/broadcast";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const msg = await getBroadcastById(params.id, auth.schoolId);
  if (!msg) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(msg);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const ok = await softDeleteBroadcast(params.id, auth.schoolId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
