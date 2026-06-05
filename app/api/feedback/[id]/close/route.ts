// PATCH — close a ticket (status → CLOSED) with an optional closing note.
// PRINCIPAL only. Rejects closing an already-closed ticket.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { closeFeedback } from "@/lib/feedback";
import { feedbackCloseSchema } from "@/lib/validations/feedback";

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine */
  }
  const parsed = feedbackCloseSchema.safeParse(body);
  const note = parsed.success ? parsed.data.closingNote : "";
  const result = await closeFeedback(params.id, auth.schoolId, auth.id, note || undefined);
  if (result.error === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result.error === "ILLEGAL_TRANSITION") return NextResponse.json({ error: "Already closed" }, { status: 409 });
  return NextResponse.json({ success: true });
}
