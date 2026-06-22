// Tuition batches: GET (list with totals) + POST (create). PRINCIPAL + TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listBatches, createBatch } from "@/lib/tuitions";
import { batchSchema } from "@/lib/validations/tuition";
import { toMinor } from "@/lib/money";

export async function GET() {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const batches = await listBatches(auth.schoolId);
  return NextResponse.json({ batches });
}

export async function POST(request: Request) {
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
  const batch = await createBatch({ ...parsed.data, feeAmount: toMinor(parsed.data.feeAmount ?? 0) }, auth.schoolId);
  return NextResponse.json(batch, { status: 201 });
}
