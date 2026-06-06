// Planners: GET (list, filtered) + POST (create). PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listPlanners, createPlanner } from "@/lib/planners";
import { plannerSchema } from "@/lib/validations/planners";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const result = await listPlanners(auth.schoolId, {
    type: searchParams.get("type") ?? undefined,
    classId: searchParams.get("classId") ?? undefined,
    subjectId: searchParams.get("subjectId") ?? undefined,
    createdById: searchParams.get("createdById") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = plannerSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const planner = await createPlanner(parsed.data, auth.schoolId, auth.id);
  return NextResponse.json(planner, { status: 201 });
}
