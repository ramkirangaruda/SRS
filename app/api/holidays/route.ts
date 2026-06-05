// GET (all holidays) + POST (create one). Read = any authed; write = principal.
import { NextResponse } from "next/server";
import { requireRole, requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listHolidays, createHoliday } from "@/lib/holidays";
import { holidayCreateSchema } from "@/lib/validations/holiday";

export async function GET() {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ data: await listHolidays(auth.schoolId) });
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = holidayCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const h = await createHoliday(auth.schoolId, parsed.data);
  return NextResponse.json({ id: h.id }, { status: 201 });
}
