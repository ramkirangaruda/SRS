// Staff collection: GET (directory list, filtered) + POST (create). PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listStaff, createStaff } from "@/lib/staff";
import { staffCreateSchema } from "@/lib/validations/staff";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const staff = await listStaff(auth.schoolId, {
    search: searchParams.get("search") ?? undefined,
    designation: searchParams.get("designation") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    department: searchParams.get("department") ?? undefined,
  });
  return NextResponse.json({ staff });
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = staffCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const result = await createStaff(parsed.data, auth.schoolId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  // tempPassword is returned ONCE so the principal can share it with the staffer.
  return NextResponse.json(result, { status: 201 });
}
