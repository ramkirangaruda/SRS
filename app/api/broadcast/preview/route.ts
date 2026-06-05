// POST — preview the audience for a target selection BEFORE sending: returns the
// recipient count + a human label ("Parents of Class 5 - A"). Uses the SAME
// resolveAudience the real send uses, so the preview can't disagree with reality.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { resolveAudience } from "@/lib/broadcast";
import { audienceSchema } from "@/lib/validations/broadcast";

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = audienceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 422 });
  }
  const { userIds, label } = await resolveAudience(auth.schoolId, parsed.data.targetRole, parsed.data.classes);
  return NextResponse.json({ count: userIds.length, label });
}
