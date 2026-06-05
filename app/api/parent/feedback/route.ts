// GET (parent's own feedback list) + POST (create new feedback). PARENT only.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listParentFeedback, createFeedback } from "@/lib/feedback";
import { feedbackCreateSchema } from "@/lib/validations/feedback";

export async function GET() {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const data = await listParentFeedback(auth.id, auth.schoolId);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = feedbackCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  // Returns the generated reference number for the confirmation screen.
  const result = await createFeedback(auth.id, auth.schoolId, parsed.data);
  return NextResponse.json(result, { status: 201 });
}
