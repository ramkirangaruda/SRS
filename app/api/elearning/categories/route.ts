// Categories: GET (list) + POST (create). Read any authed; write principal/teacher.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listCategories, createCategory } from "@/lib/elearning";

export async function GET() {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ data: await listCategories(auth.schoolId) });
}
export async function POST(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: "Name is required" }, { status: 422 });
  const c = await createCategory(auth.schoolId, body);
  return NextResponse.json({ id: c.id }, { status: 201 });
}
