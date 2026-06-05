// Tutorials: GET (list, filter by category/class) + POST (create).
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listTutorials, createTutorial } from "@/lib/elearning";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  const sp = new URL(request.url).searchParams;
  return NextResponse.json({ data: await listTutorials(auth.schoolId, { categoryId: sp.get("categoryId") ?? undefined, classId: sp.get("classId") ?? undefined }) });
}
export async function POST(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  if (!body.title || !body.type) return NextResponse.json({ error: "Title and type are required" }, { status: 422 });
  const t = await createTutorial(auth.schoolId, auth.id, body);
  return NextResponse.json({ id: t.id }, { status: 201 });
}
