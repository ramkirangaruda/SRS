// Parent: a specific day's full log for one of their children (read-only).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getLog, parentOwns } from "@/lib/daycare";
import { todayKey } from "@/lib/calendar";

export async function GET(request: Request, { params }: { params: { studentId: string } }) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  if (!(await parentOwns(params.studentId, auth.id, auth.schoolId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const date = new URL(request.url).searchParams.get("date") ?? todayKey();
  return NextResponse.json(await getLog(params.studentId, auth.schoolId, date));
}
