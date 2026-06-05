// PATCH — publish reports (DRAFT → PUBLISHED). Accepts an array of ids.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { publishReports } from "@/lib/progress-reports";

export async function PATCH(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const b = await request.json().catch(() => ({}));
  const ids: string[] = Array.isArray(b.ids) ? b.ids : [];
  if (ids.length === 0) return NextResponse.json({ error: "ids required" }, { status: 400 });
  const count = await publishReports(ids, auth.schoolId);
  return NextResponse.json({ count });
}
