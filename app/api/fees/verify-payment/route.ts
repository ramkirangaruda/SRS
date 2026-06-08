// Verify a completed Razorpay payment and, only if genuine, record the FeePayment.
// PARENT only. The signature check (see lib/razorpay verifyPaymentSignature) is
// what makes this trustworthy — a forged "success" POST fails the HMAC and is
// rejected, so no FeePayment is created.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { recordPayment, FeeError } from "@/lib/fees";
import { verifyPaymentSignature } from "@/lib/razorpay";

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body as { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 422 });
  }

  // The transaction must exist, belong to THIS parent, and not already be paid.
  const txn = await prisma.paymentTransaction.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
  if (!txn || txn.parentId !== auth.id || txn.schoolId !== auth.schoolId) {
    return NextResponse.json({ error: "Unknown order" }, { status: 404 });
  }
  if (txn.status === "PAID") return NextResponse.json({ error: "Already processed" }, { status: 409 });

  // THE critical check. Tampered/forged → mark FAILED, create nothing.
  const genuine = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
  if (!genuine) {
    await prisma.paymentTransaction.update({ where: { id: txn.id }, data: { status: "FAILED", razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature } });
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // Genuine → record the FeePayment (mode ONLINE, receipt = razorpay payment id).
  // recordPayment re-checks the balance inside its own transaction, so a double
  // submit or stale amount can't overshoot.
  try {
    const result = await recordPayment({
      studentId: txn.studentId, amount: txn.amount, date: new Date(), mode: "ONLINE",
      receiptNumber: razorpay_payment_id, notes: "Razorpay online payment",
      collectedById: auth.id, schoolId: auth.schoolId,
    });
    await prisma.paymentTransaction.update({ where: { id: txn.id }, data: { status: "PAID", razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature } });
    return NextResponse.json({ ok: true, paymentId: razorpay_payment_id, amount: txn.amount, status: result.status });
  } catch (e) {
    // Signature was valid but recording failed (e.g. balance changed). Keep the
    // txn record for reconciliation; report so the parent isn't wrongly "paid".
    await prisma.paymentTransaction.update({ where: { id: txn.id }, data: { status: "FAILED", razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature } });
    const msg = e instanceof FeeError ? e.message : "Could not record payment";
    return NextResponse.json({ error: msg }, { status: 409 });
  }
}
