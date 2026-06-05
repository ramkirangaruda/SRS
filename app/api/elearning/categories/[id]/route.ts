// PUT (update) + DELETE (blocked if the category still has tutorials/assignments).
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { updateCategory, deleteCategory } from "@/lib/elearning";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  const ok = await updateCategory(params.id, auth.schoolId, body);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const result = await deleteCategory(params.id, auth.schoolId);
  if ("error" in result) {
    if (result.error === "not_found") return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ error: "Category has tutorials or assignments — move or delete those first." }, { status: 409 });
  }
  return NextResponse.json({ success: true });
}
