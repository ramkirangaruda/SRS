// Enquiry categories: GET (list) + POST (create). PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listCategories, createCategory } from "@/lib/enquiry";

export async function GET() {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ categories: await listCategories(auth.schoolId) });
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const name = (body as { name?: string }).name?.trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 422 });
  return NextResponse.json(await createCategory(name, auth.schoolId), { status: 201 });
}
