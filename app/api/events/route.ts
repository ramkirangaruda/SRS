// GET (events for a month, expanded) + POST (create). Principal write; both
// roles can read the school calendar.
import { NextResponse } from "next/server";
import { requireRole, requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listEventsForMonth, createEvent } from "@/lib/events";
import { eventCreateSchema } from "@/lib/validations/event";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getUTCFullYear();
  const month = Number(searchParams.get("month")) || now.getUTCMonth() + 1;
  const type = searchParams.get("type") || undefined;
  const data = await listEventsForMonth(auth.schoolId, year, month, type);
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = eventCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const ev = await createEvent(parsed.data, auth.schoolId);
  return NextResponse.json({ id: ev.id }, { status: 201 });
}
