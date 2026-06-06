// Parent: aggregated weekly daycare stats for one of their children.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { weeklySummary, parentOwns } from "@/lib/daycare";

export async function GET(_req: Request, { params }: { params: { studentId: string } }) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  if (!(await parentOwns(params.studentId, auth.id, auth.schoolId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(await weeklySummary(params.studentId, auth.schoolId));
}
