// GET — a week (Mon..Sat) for the planner. POST — save the whole week at once.
import { NextResponse } from "next/server";
import { requireRole, requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getWeek, saveWeek, type MealMenu } from "@/lib/meals";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("week") || new Date().toISOString().slice(0, 10);
  const type = searchParams.get("type") === "DAYCARE" ? "DAYCARE" : "SCHOOL";
  return NextResponse.json(await getWeek(auth.schoolId, key, type));
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: { type?: string; days?: { date: string; menu: MealMenu }[] };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!Array.isArray(body.days)) return NextResponse.json({ error: "days[] required" }, { status: 400 });
  const type = body.type === "DAYCARE" ? "DAYCARE" : "SCHOOL";
  const result = await saveWeek(auth.schoolId, type, body.days);
  return NextResponse.json(result);
}
