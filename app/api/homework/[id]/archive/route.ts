// PATCH /api/homework/[id]/archive — toggles ACTIVE <-> ARCHIVED (soft delete).
// This is the "Archive" / "Restore" action. PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { toggleArchive } from "@/lib/homework";

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;

  const status = await toggleArchive(params.id, auth.schoolId);
  if (!status) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ status });
}
