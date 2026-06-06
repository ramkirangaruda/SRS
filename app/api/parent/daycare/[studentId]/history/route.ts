// Parent: daycare history (mood dots) for one of their children.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { history, parentOwns } from "@/lib/daycare";

export async function GET(request: Request, { params }: { params: { studentId: string } }) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  if (!(await parentOwns(params.studentId, auth.id, auth.schoolId))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from"); const to = searchParams.get("to");
  if (!from || !to) return NextResponse.json({ error: "from and to required" }, { status: 400 });
  return NextResponse.json({ logs: await history(params.studentId, auth.schoolId, from, to) });
}
