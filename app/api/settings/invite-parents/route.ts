// Bulk-create parent accounts from parsed CSV rows. PRINCIPAL.
// Body: { rows: [{ name, email, phone }] }. Returns per-row results incl. temp passwords.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { bulkInviteParents } from "@/lib/settings";

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const rows = (body as { rows?: { name: string; email: string; phone?: string }[] }).rows;
  if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: "No rows" }, { status: 422 });
  if (rows.length > 500) return NextResponse.json({ error: "Too many rows (max 500)" }, { status: 422 });
  return NextResponse.json(await bulkInviteParents(auth.schoolId, rows));
}
