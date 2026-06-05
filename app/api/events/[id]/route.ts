// GET (single base event) + PUT (update) + DELETE (all / single occurrence).
import { NextResponse } from "next/server";
import { requireRole, requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getEvent, updateEvent, deleteEvent } from "@/lib/events";
import { eventUpdateSchema } from "@/lib/validations/event";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  const ev = await getEvent(params.id, auth.schoolId);
  if (!ev) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(ev);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = eventUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const ok = await updateEvent(params.id, parsed.data, auth.schoolId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

// ?scope=all|occurrence&date=YYYY-MM-DD
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const scope = (searchParams.get("scope") === "occurrence" ? "occurrence" : "all") as "all" | "occurrence";
  const date = searchParams.get("date") || undefined;
  const ok = await deleteEvent(params.id, auth.schoolId, scope, date);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
