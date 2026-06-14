// FRONTEND CALLBACK verification. PARENT only. This is the "happy path" — the
// browser reports a successful checkout and we confirm it. Security layers:
//   1. HMAC signature (order|payment) proves the callback is genuinely Razorpay's
//      and untampered — we NEVER trust the browser's word alone.
//   2. finalizeVerifiedPayment then re-checks the AMOUNT against Razorpay's API
//      and records idempotently.
// The webhook (/api/fees/webhook) is the backup if the parent closes the browser
// before this fires — both routes converge on the same idempotent finalizer.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { verifyPaymentSignature } from "@/lib/razorpay";
import { finalizeVerifiedPayment } from "@/lib/payments";

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body as { razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string };
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 422 });
  }

  // The transaction must exist and belong to THIS parent.
  const txn = await prisma.paymentTransaction.findUnique({ where: { razorpayOrderId: razorpay_order_id } });
  if (!txn || txn.parentId !== auth.id || txn.schoolId !== auth.schoolId) {
    return NextResponse.json({ error: "Unknown order" }, { status: 404 });
  }

  // 1. HMAC check — forged/tampered callback → mark FAILED, record nothing.
  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    await prisma.paymentTransaction.update({ where: { id: txn.id }, data: { status: "FAILED", razorpayPaymentId: razorpay_payment_id, razorpaySignature: razorpay_signature } });
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }
  // Persist the signature for the audit trail.
  await prisma.paymentTransaction.update({ where: { id: txn.id }, data: { razorpaySignature: razorpay_signature } });

  // 2. Amount-match + idempotent record (shared with the webhook).
  const result = await finalizeVerifiedPayment(txn, razorpay_payment_id);
  switch (result.status) {
    case "success":
    case "already": // a retry or the webhook beat us — still report success
      return NextResponse.json({ ok: true, paymentId: razorpay_payment_id, amount: txn.amount });
    case "amount_mismatch":
      return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
    case "not_captured":
      return NextResponse.json({ error: "Payment not captured" }, { status: 400 });
    default:
      return NextResponse.json({ error: result.message }, { status: 409 });
  }
}
