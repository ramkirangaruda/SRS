// Virtual classroom collection: GET (list, filtered) + POST (create).
// PRINCIPAL or TEACHER (the host).
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listClasses, createClass } from "@/lib/virtual-classroom";
import { vcCreateSchema } from "@/lib/validations/virtual-classroom";

const FILTERS = ["upcoming", "completed", "all"] as const;

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const f = searchParams.get("filter") ?? "all";
  const filter = (FILTERS.includes(f as never) ? f : "all") as (typeof FILTERS)[number];
  const items = await listClasses(auth.schoolId, filter, searchParams.get("classId") ?? undefined);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = vcCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const item = await createClass(parsed.data, auth.schoolId, auth.id);
  return NextResponse.json(item, { status: 201 });
}
