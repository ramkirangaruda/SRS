// GET — single feedback with full thread. Ownership enforced (parentId filter);
// opening it also marks the principal's reply as seen. PARENT only.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getParentFeedback } from "@/lib/feedback";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const fb = await getParentFeedback(params.id, auth.id, auth.schoolId);
  if (!fb) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(fb);
}
