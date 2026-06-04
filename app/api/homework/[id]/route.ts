// Single homework: GET, PUT (update + attachment add/remove), DELETE (permanent).
// PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getHomeworkById, updateHomework, deleteHomework } from "@/lib/homework";
import { homeworkUpdateSchema } from "@/lib/validations/homework";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;

  const hw = await getHomeworkById(params.id, auth.schoolId);
  if (!hw) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(hw);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = homeworkUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  const updated = await updateHomework(params.id, parsed.data, auth.schoolId);
  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(updated);
}

// Hard delete — also removes attachment files from storage (see lib/homework).
export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;

  const ok = await deleteHomework(params.id, auth.schoolId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
