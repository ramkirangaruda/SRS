// POST /api/fees/payment — record a payment (principal only).
//
// WHY VALIDATE ON BOTH ENDS: the client checks "amount <= balance" for instant
// feedback, but the client can be bypassed (curl, a stale page, two clerks at
// once). So the SERVER re-checks the balance INSIDE a transaction — that's the
// authoritative guard. The client check is UX; the server check is correctness.
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { recordPayment, FeeError } from "@/lib/fees";
import { paymentCreateSchema } from "@/lib/validations/fee";
import { toMinor, formatINR } from "@/lib/money";

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = paymentCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const result = await recordPayment({
      studentId: parsed.data.studentId,
      amount: toMinor(parsed.data.amount), // rupees -> paise
      date: new Date(parsed.data.date),
      mode: parsed.data.mode,
      receiptNumber: parsed.data.receiptNumber,
      notes: parsed.data.notes || null,
      collectedById: auth.id,
      schoolId: auth.schoolId,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    // Domain errors from the balance check map to clear HTTP statuses.
    if (e instanceof FeeError) {
      if (e.code === "NOT_FOUND") return NextResponse.json({ error: "Student not found" }, { status: 404 });
      const meta = e.meta as { pending?: number } | undefined;
      const msg =
        e.code === "EXCEEDS_BALANCE" && meta?.pending != null
          ? `Amount exceeds the pending balance (${formatINR(meta.pending)}).`
          : e.message;
      return NextResponse.json({ error: msg }, { status: 422 });
    }
    // Duplicate receipt number.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ error: "That receipt number is already used." }, { status: 409 });
    }
    console.error("Record payment failed:", e);
    return NextResponse.json({ error: "Failed to record payment" }, { status: 500 });
  }
}
