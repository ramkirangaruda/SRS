// Subjects + resource counts for the folder view. PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { resourceSubjects } from "@/lib/planners";

export async function GET() {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ subjects: await resourceSubjects(auth.schoolId) });
}
