// Visitors: GET (list, filtered) + POST (check in). PRINCIPAL only.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listVisitors, createVisitor, todayCounts } from "@/lib/visitors";
import { visitorCreateSchema } from "@/lib/validations/visitors";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const result = await listVisitors(auth.schoolId, {
    date: searchParams.get("date") ?? undefined,
    from: searchParams.get("from") ?? undefined,
    to: searchParams.get("to") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    purpose: searchParams.get("purpose") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
  });
  const counts = await todayCounts(auth.schoolId);
  return NextResponse.json({ ...result, counts });
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = visitorCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const visitor = await createVisitor(parsed.data, auth.schoolId);
  return NextResponse.json(visitor, { status: 201 });
}
