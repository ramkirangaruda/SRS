// Record check-out. PRINCIPAL. 409 if already checked out.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { checkoutVisitor } from "@/lib/visitors";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const result = await checkoutVisitor(params.id, auth.schoolId);
  if (result === "notfound") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "already") return NextResponse.json({ error: "Already checked out" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
