// Single combined parent dashboard endpoint for the selected child.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { parentDashboard } from "@/lib/dashboard";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const studentId = new URL(request.url).searchParams.get("studentId") ?? undefined;
  return NextResponse.json(await parentDashboard(auth.id, auth.schoolId, studentId));
}
