// Admissions: GET (list or groupBy=status) + POST (create application). PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listAdmissions, listAdmissionsGrouped, createApplication } from "@/lib/admissions";
import { admissionCreateSchema } from "@/lib/validations/admissions";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  if (searchParams.get("groupBy") === "status") {
    return NextResponse.json({ grouped: await listAdmissionsGrouped(auth.schoolId) });
  }
  const result = await listAdmissions(auth.schoolId, {
    status: searchParams.get("status") ?? undefined,
    classAppliedFor: searchParams.get("classAppliedFor") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = admissionCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const a = await createApplication(parsed.data, auth.schoolId, auth.id);
  return NextResponse.json({ id: a.id }, { status: 201 });
}
