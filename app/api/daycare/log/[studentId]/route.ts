// Daily log: GET (?date=YYYY-MM-DD) + PUT (sync save). PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getLog, syncLog } from "@/lib/daycare";
import { daycareLogSchema } from "@/lib/validations/daycare";
import { todayKey } from "@/lib/calendar";

export async function GET(request: Request, { params }: { params: { studentId: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? todayKey();
  return NextResponse.json(await getLog(params.studentId, auth.schoolId, date));
}

export async function PUT(request: Request, { params }: { params: { studentId: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = daycareLogSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const { date, ...rest } = parsed.data;
  const id = await syncLog(params.studentId, auth.schoolId, auth.id, date, rest);
  if (id === null) return NextResponse.json({ error: "Not a daycare student" }, { status: 400 });
  return NextResponse.json({ ok: true, id });
}
