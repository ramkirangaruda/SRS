// GET — holidays for the parent. Same school-wide data as the principal (no
// per-class difference) plus the "next holiday" for the countdown card.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listHolidays, nextHoliday } from "@/lib/holidays";

export async function GET() {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const [data, next] = await Promise.all([listHolidays(auth.schoolId), nextHoliday(auth.schoolId)]);
  return NextResponse.json({ data, next });
}
