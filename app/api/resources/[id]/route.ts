// Single resource: PUT (edit) / DELETE. Uploader or principal only.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { updateResource, deleteResource } from "@/lib/planners";
import { resourceUpdateSchema } from "@/lib/validations/planners";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = resourceUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const result = await updateResource(params.id, parsed.data, auth.schoolId, auth.id, auth.role === ROLES.PRINCIPAL);
  if (result === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Only the uploader or principal can edit" }, { status: 403 });
  return NextResponse.json(result);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const result = await deleteResource(params.id, auth.schoolId, auth.id, auth.role === ROLES.PRINCIPAL);
  if (result === "notfound") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Only the uploader or principal can delete" }, { status: 403 });
  return NextResponse.json({ ok: true });
}
