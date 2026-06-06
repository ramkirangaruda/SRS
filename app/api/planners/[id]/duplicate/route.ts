// Clone a planner (deep copy of scalars; new owner = the duplicator).
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { duplicatePlanner } from "@/lib/planners";

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const p = await duplicatePlanner(params.id, auth.schoolId, auth.id);
  if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(p, { status: 201 });
}
