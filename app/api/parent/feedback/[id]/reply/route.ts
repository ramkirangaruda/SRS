// POST — parent adds a follow-up message. Transitions REPLIED/CLOSED → REOPENED
// (the state machine lives in lib/feedback-state). PARENT only, ownership enforced.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { parentReply } from "@/lib/feedback";
import { feedbackReplySchema } from "@/lib/validations/feedback";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PARENT);
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
  const result = await parentReply(params.id, auth.id, auth.schoolId, parsed.data);
  if (result.error === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
