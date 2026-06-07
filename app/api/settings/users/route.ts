// Manage users: GET (list, filtered) + POST (create with optional student links).
// PRINCIPAL. Also exposes linkable students via ?students=1 for the create form.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listUsers, createUser, listLinkableStudents } from "@/lib/settings";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  if (searchParams.get("students") === "1") {
    return NextResponse.json({ students: await listLinkableStudents(auth.schoolId) });
  }
  const result = await listUsers(auth.schoolId, {
    role: searchParams.get("role") ?? undefined,
    status: searchParams.get("status") ?? undefined,
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
  const b = body as { name?: string; email?: string; phone?: string; role?: string; password?: string; studentIds?: string[] };
  if (!b.name?.trim() || !b.email?.trim() || !b.role) return NextResponse.json({ error: "Name, email and role are required" }, { status: 422 });
  if (b.role !== ROLES.TEACHER && b.role !== ROLES.PARENT) return NextResponse.json({ error: "Role must be TEACHER or PARENT" }, { status: 422 });
  const result = await createUser(auth.schoolId, { name: b.name.trim(), email: b.email.trim(), phone: b.phone, role: b.role, password: b.password, studentIds: b.studentIds });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json(result, { status: 201 });
}
