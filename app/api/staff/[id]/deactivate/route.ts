// Soft-deactivate / reactivate a staff member. PRINCIPAL.
// POST /api/staff/[id]/deactivate          → RESIGNED + login blocked
// POST /api/staff/[id]/deactivate?reactivate=1 → ACTIVE + login restored
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { setStaffActive } from "@/lib/staff";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const reactivate = searchParams.get("reactivate") === "1";
  const ok = await setStaffActive(params.id, auth.schoolId, reactivate);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true, active: reactivate });
}
