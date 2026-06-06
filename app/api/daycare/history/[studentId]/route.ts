// Daycare history for a date range (mood dots for the calendar). PRINCIPAL/TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { history } from "@/lib/daycare";

export async function GET(request: Request, { params }: { params: { studentId: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from"); const to = searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });
  return NextResponse.json({ logs: await history(params.studentId, auth.schoolId, from, to) });
}
