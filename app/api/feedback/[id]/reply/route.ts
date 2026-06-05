// POST — principal replies; status → REPLIED. The state machine REJECTS a reply
// to a CLOSED ticket (returns 409), which is the bug-prevention payoff.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { principalReply } from "@/lib/feedback";
import { feedbackReplySchema } from "@/lib/validations/feedback";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = feedbackReplySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const result = await principalReply(params.id, auth.schoolId, auth.id, parsed.data);
  if (result.error === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result.error === "ILLEGAL_TRANSITION") {
    return NextResponse.json({ error: "Cannot reply to a closed ticket. Reopen it first." }, { status: 409 });
  }
  return NextResponse.json({ success: true });
}
