// One tuition batch: GET (detail with students + payments) + PATCH + DELETE.
// PRINCIPAL + TEACHER, scoped to the caller's school.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getBatchDetail, updateBatch, deleteBatch } from "@/lib/tuitions";
import { batchSchema } from "@/lib/validations/tuition";
import { toMinor } from "@/lib/money";

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const detail = await getBatchDetail(params.id, auth.schoolId);
  if (!detail) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  return NextResponse.json(detail);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = batchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const batch = await updateBatch(params.id, { ...parsed.data, feeAmount: toMinor(parsed.data.feeAmount ?? 0) }, auth.schoolId);
  if (!batch) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  return NextResponse.json(batch);
}

export async function DELETE(_request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const ok = await deleteBatch(params.id, auth.schoolId);
  if (!ok) return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
