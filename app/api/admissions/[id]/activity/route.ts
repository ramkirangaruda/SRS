// Add a note to an application (e.g. "Request More Info"). PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { addActivity } from "@/lib/admissions";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const note = (body as { note?: string }).note?.trim();
  if (!note) return NextResponse.json({ error: "Note is required" }, { status: 422 });
  const ok = await addActivity(params.id, auth.schoolId, auth.id, note);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
