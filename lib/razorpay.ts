// Razorpay server helpers. KEY_SECRET lives ONLY here (server) — it both
// authenticates our order-creation calls AND is the secret used to verify that a
// payment confirmation is genuine.
import Razorpay from "razorpay";
import crypto from "crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
// SEPARATE secret, set when you create the webhook in the Razorpay dashboard.
// It signs webhook payloads (distinct from KEY_SECRET which signs checkout).
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;

export function razorpayConfigured(): boolean {
  return !!(KEY_ID && KEY_SECRET && !KEY_ID.includes("REPLACE"));
}

function client(): Razorpay {
  if (!KEY_ID || !KEY_SECRET) throw new Error("Razorpay keys are not configured");
  return new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
}

// Fetch the authoritative payment record from Razorpay (server-to-server, signed
// with our secret). We use this to VERIFY THE AMOUNT — never trust the amount the
// browser sends. We compare Razorpay's confirmed amount/order against what we
// originally requested (rule 4: someone could tamper the frontend to show ₹100
// for a ₹15,000 order; the backend catches the mismatch here).
export async function fetchRazorpayPayment(paymentId: string) {
  const p = await client().payments.fetch(paymentId);
  return p as unknown as { id: string; order_id: string; amount: number; currency: string; status: string };
}

// Create an order on Razorpay. amount is in paise (Razorpay's smallest unit).
// The returned order.id is what the browser hands to Checkout.
export async function createRazorpayOrder(amountPaise: number, receipt: string) {
  const order = await client().orders.create({ amount: amountPaise, currency: "INR", receipt, payment_capture: true });
  return order; // { id, amount, currency, ... }
}

// SIGNATURE VERIFICATION — the security heart of this integration.
//
// When Checkout succeeds the browser receives razorpay_order_id, _payment_id, and
// _signature. The browser is UNTRUSTED — a malicious user could POST fake values
// to our verify endpoint claiming "I paid". Razorpay protects against this: it
// computes signature = HMAC_SHA256(order_id + "|" + payment_id, KEY_SECRET). Only
// Razorpay and our server know KEY_SECRET, so only a genuine Razorpay response can
// carry a signature that matches when we recompute it here. If the recomputed
// HMAC equals the received signature, the payment is real and untampered; if not,
// we reject it and never create a FeePayment. Without this check, anyone could
// fake a "payment successful" call and get marked as paid for free.
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!KEY_SECRET) return false;
  const expected = crypto.createHmac("sha256", KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
  // timingSafeEqual avoids leaking info via comparison timing. Lengths must match.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function webhookConfigured(): boolean {
  return !!WEBHOOK_SECRET && !WEBHOOK_SECRET.includes("REPLACE");
}

// WEBHOOK SIGNATURE VERIFICATION. Razorpay POSTs us payment events and signs the
// RAW request body with the webhook secret: signature = HMAC_SHA256(rawBody,
// WEBHOOK_SECRET), sent in the X-Razorpay-Signature header. We must verify this
// before trusting ANY webhook — otherwise anyone could POST a fake "payment
// captured" event to our public webhook URL. We hash the exact raw bytes (not a
// re-serialized JSON) so the signature matches byte-for-byte.
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
