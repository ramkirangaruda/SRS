// GET /api/fees/students — every student with fee calculations, supporting
// search, class filter, status filter, and pagination (principal only).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listStudentFees, type FeeStatus } from "@/lib/fees";

const STATUSES = ["PAID", "PARTIAL", "UNPAID"];

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status") ?? undefined;
  const status = statusParam && STATUSES.includes(statusParam) ? (statusParam as FeeStatus) : undefined;

  const result = await listStudentFees({
    schoolId: auth.schoolId,
    search: searchParams.get("search") ?? undefined,
    classId: searchParams.get("classId") ?? undefined,
    status,
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 10),
  });
  return NextResponse.json(result);
}
