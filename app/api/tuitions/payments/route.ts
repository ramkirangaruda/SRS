// Record a tuition payment. POST { batchId, studentId, amount(rupees), mode, notes,
// date }. PRINCIPAL + TEACHER. Amount is converted rupees → paise here.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { recordTuitionPayment } from "@/lib/tuitions";
import { tuitionPaymentSchema } from "@/lib/validations/tuition";
import { toMinor } from "@/lib/money";

export async function POST(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = tuitionPaymentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const result = await recordTuitionPayment(
    { ...parsed.data, amount: toMinor(parsed.data.amount) },
    auth.schoolId,
    auth.id
  );
  if (result === "invalid") return NextResponse.json({ error: "Amount must be greater than zero" }, { status: 400 });
  if (result === "notfound") return NextResponse.json({ error: "Student is not enrolled in this batch" }, { status: 404 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
