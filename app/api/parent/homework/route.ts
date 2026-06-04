// GET /api/parent/homework?status= — homework for the logged-in parent's
// children's classes/sections, grouped by child. PARENT only; ownership is
// enforced by only querying classes/sections the parent's children belong to.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getParentHomework, type HomeworkStatus } from "@/lib/homework";

const STATUSES = ["ACTIVE", "ARCHIVED"];

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const statusRaw = searchParams.get("status") ?? "ACTIVE";
  const status = (STATUSES.includes(statusRaw) ? statusRaw : "ACTIVE") as HomeworkStatus;

  const groups = await getParentHomework(auth.id, auth.schoolId, status);
  return NextResponse.json({ groups });
}
