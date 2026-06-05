// GET — all feedback for the school with filters + pagination. PRINCIPAL only.
// Anonymous tickets come back with parent identity stripped (see lib/feedback).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listFeedback } from "@/lib/feedback";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const result = await listFeedback({
    schoolId: auth.schoolId,
    status: searchParams.get("status") ?? undefined,
    category: searchParams.get("category") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
  });
  return NextResponse.json(result);
}
