// GET — single feedback with thread, parent identity stripped if anonymous.
// PRINCIPAL only.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getFeedback } from "@/lib/feedback";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const fb = await getFeedback(params.id, auth.schoolId);
  if (!fb) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(fb);
}
