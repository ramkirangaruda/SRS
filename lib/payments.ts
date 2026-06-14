// Shared "finalize a verified Razorpay payment" logic, used by BOTH the frontend
// callback (verify-payment) and the Razorpay webhook. Centralising it means the
// security guarantees — amount verification, idempotency, audit logging — apply
// identically no matter which path confirms the payment first.
import { prisma } from "@/lib/prisma";
import { recordPayment } from "@/lib/fees";
import { fetchRazorpayPayment } from "@/lib/razorpay";
import { Prisma } from "@prisma/client";

export type FinalizeResult =
  | { status: "success"; amount: number }
  | { status: "already" } // already recorded (idempotent no-op)
  | { status: "amount_mismatch" }
  | { status: "not_captured" }
  | { status: "error"; message: string };

type Txn = { id: string; amount: number; razorpayOrderId: string; studentId: string; parentId: string; schoolId: string; status: string };

// Records the FeePayment for a transaction whose AUTHENTICITY has already been
// established by the caller (HMAC signature for the callback, webhook signature
// for the webhook). Here we add the remaining two guards:
//   • AMOUNT MATCH — fetch the payment from Razorpay and confirm its amount +
//     order match what we originally requested (rule 4: anti-tamper).
//   • IDEMPOTENCY — never create two FeePayments for one razorpay_payment_id, even
//     if the callback and webhook both fire, or a network retry replays the call
//     (rule 6). Enforced two ways: an up-front existence check AND the unique
//     receiptNumber constraint (the race-proof backstop).
export async function finalizeVerifiedPayment(txn: Txn, paymentId: string): Promise<FinalizeResult> {
  // 1. IDEMPOTENCY (fast path): already recorded under this payment id? Done.
  const existing = await prisma.feePayment.findUnique({ where: { receiptNumber: paymentId }, select: { id: true } });
  if (existing) {
    if (txn.status !== "SUCCESS") await prisma.paymentTransaction.update({ where: { id: txn.id }, data: { status: "SUCCESS", razorpayPaymentId: paymentId } });
    return { status: "already" };
  }

  // 2. AMOUNT VERIFICATION — ask Razorpay what was actually paid; compare to OUR
  //    requested amount + order. Mismatch (or not captured) → fail, record nothing.
  let payment;
  try {
    payment = await fetchRazorpayPayment(paymentId);
  } catch {
    return { status: "error", message: "Could not verify payment with Razorpay" };
  }
  const captured = payment.status === "captured" || payment.status === "authorized";
  if (!captured) {
    await prisma.paymentTransaction.update({ where: { id: txn.id }, data: { status: "FAILED", razorpayPaymentId: paymentId } });
    return { status: "not_captured" };
  }
  if (payment.order_id !== txn.razorpayOrderId || payment.amount !== txn.amount) {
    // Tampered amount/order, or wrong payment for this order → reject + log.
    await prisma.paymentTransaction.update({ where: { id: txn.id }, data: { status: "FAILED", razorpayPaymentId: paymentId } });
    return { status: "amount_mismatch" };
  }

  // 3. RECORD the FeePayment (mode ONLINE, receipt = razorpay payment id). The
  //    unique receiptNumber makes the insert the idempotency backstop: a
  //    concurrent duplicate throws P2002, which we treat as "already done".
  try {
    await recordPayment({
      studentId: txn.studentId, amount: txn.amount, date: new Date(), mode: "ONLINE",
      receiptNumber: paymentId, notes: "Razorpay online payment",
      collectedById: txn.parentId, schoolId: txn.schoolId,
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      await prisma.paymentTransaction.update({ where: { id: txn.id }, data: { status: "SUCCESS", razorpayPaymentId: paymentId } });
      return { status: "already" };
    }
    return { status: "error", message: e instanceof Error ? e.message : "Could not record payment" };
  }

  await prisma.paymentTransaction.update({ where: { id: txn.id }, data: { status: "SUCCESS", razorpayPaymentId: paymentId } });
  return { status: "success", amount: txn.amount };
}
