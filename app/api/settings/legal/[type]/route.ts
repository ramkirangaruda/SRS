// Legal content: GET (PUBLIC — no auth, used by login footer + public pages) and
// PUT (PRINCIPAL only). type = "privacy" | "terms".
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getLegal, updateLegal, firstSchoolId } from "@/lib/settings";

function asType(t: string): "privacy" | "terms" | null {
  return t === "privacy" || t === "terms" ? t : null;
}

// PUBLIC: anyone can read the policy (it's linked from the login page).
export async function GET(_req: Request, { params }: { params: { type: string } }) {
  const type = asType(params.type);
  if (!type) return NextResponse.json({ error: "Bad type" }, { status: 400 });
  const schoolId = await firstSchoolId();
  if (!schoolId) return NextResponse.json({ schoolName: "School", content: "" });
  return NextResponse.json(await getLegal(schoolId, type));
}

export async function PUT(request: Request, { params }: { params: { type: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const type = asType(params.type);
  if (!type) return NextResponse.json({ error: "Bad type" }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const content = (body as { content?: string }).content;
  if (typeof content !== "string") return NextResponse.json({ error: "Content required" }, { status: 422 });
  await updateLegal(auth.schoolId, type, content);
  return NextResponse.json({ ok: true });
}
