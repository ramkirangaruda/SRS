// GET — meals for a month + type (SCHOOL/DAYCARE), for the calendar. Read = any authed.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listMealsForMonth } from "@/lib/meals";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getUTCFullYear();
  const month = Number(searchParams.get("month")) || now.getUTCMonth() + 1;
  const type = searchParams.get("type") === "DAYCARE" ? "DAYCARE" : "SCHOOL";
  return NextResponse.json({ data: await listMealsForMonth(auth.schoolId, year, month, type) });
}
