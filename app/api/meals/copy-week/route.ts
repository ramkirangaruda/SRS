// POST — copy one week's meals to another week (the "clone previous week" action).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { copyWeek } from "@/lib/meals";

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: { from?: string; to?: string; type?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body.from || !body.to) return NextResponse.json({ error: "from and to required" }, { status: 400 });
  const type = body.type === "DAYCARE" ? "DAYCARE" : "SCHOOL";
  const result = await copyWeek(auth.schoolId, body.from, body.to, type);
  return NextResponse.json(result);
}
