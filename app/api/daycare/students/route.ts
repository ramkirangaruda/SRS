// Daycare-enrolled students + today's check-in status. PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listDaycareStudents } from "@/lib/daycare";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;
  return NextResponse.json({ students: await listDaycareStudents(auth.schoolId, date) });
}
