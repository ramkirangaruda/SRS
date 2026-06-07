// Academic years: GET (list) + POST (create, optionally set active). PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listAcademicYears, createAcademicYear } from "@/lib/settings";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ years: await listAcademicYears(auth.schoolId) });
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const b = body as { name?: string; startDate?: string; endDate?: string; setActive?: boolean };
  if (!b.name?.trim() || !b.startDate || !b.endDate) return NextResponse.json({ error: "Name, start and end dates are required" }, { status: 422 });
  const y = await createAcademicYear(auth.schoolId, { name: b.name.trim(), startDate: b.startDate, endDate: b.endDate, setActive: b.setActive });
  return NextResponse.json({ id: y.id }, { status: 201 });
}
