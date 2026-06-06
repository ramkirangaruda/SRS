// Bell-schedule (PeriodTemplate) endpoints. GET = list, PUT = replace the whole
// schedule. PRINCIPAL only (it's a school-wide structural setting).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listPeriods, savePeriods } from "@/lib/timetable";
import { savePeriodsSchema } from "@/lib/validations/timetable";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ periods: await listPeriods(auth.schoolId) });
}

export async function PUT(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = savePeriodsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });

  const periods = await savePeriods(auth.schoolId, parsed.data.periods);
  return NextResponse.json({ periods });
}
