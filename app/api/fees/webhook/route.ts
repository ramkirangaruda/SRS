// RAZORPAY WEBHOOK — backup verification. PUBLIC route (Razorpay calls it, not a
// logged-in user), so its ONLY authentication is the webhook signature.
//
// Why it exists: the frontend callback can be lost — the parent pays, then closes
// the browser before /verify-payment runs. Razorpay still POSTs us the
// `payment.captured` event here, so the payment is recorded regardless. Both paths
// funnel into the same idempotent finalizer, so a payment confirmed by BOTH the
// callback and the webhook is recorded exactly once.
//
// We MUST read the RAW body (not parsed JSON) to verify the signature byte-for-byte.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature, webhookConfigured } from "@/lib/razorpay";
import { finalizeVerifiedPayment } from "@/lib/payments";

export async function POST(request: Request) {
  if (!webhookConfigured()) return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });

  // 1. Raw body + signature header → verify BEFORE trusting anything.
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature");
  if (!verifyWebhookSignature(raw, signature)) {
    // Unsigned/forged → reject. (Razorpay won't retry a 4xx for bad signature.)
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string } } } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Bad JSON" }, { status: 400 }); }

  // 2. We only act on a captured payment. Other events → acknowledge + ignore.
  if (event.event === "payment.captured" || event.event === "payment.authorized") {
    const entity = event.payload?.payment?.entity;
    const paymentId = entity?.id;
    const orderId = entity?.order_id;
    if (paymentId && orderId) {
      const txn = await prisma.paymentTransaction.findUnique({ where: { razorpayOrderId: orderId } });
      // finalizeVerifiedPayment is idempotent — safe even if the callback already
      // recorded this payment, and safe if Razorpay retries the webhook.
      if (txn) await finalizeVerifiedPayment(txn, paymentId);
    }
  }

  // 3. ALWAYS 200 for a validly-signed event we accepted (even if ignored), so
  //    Razorpay stops retrying. (4xx above is reserved for bad signatures.)
  return NextResponse.json({ ok: true });
}
