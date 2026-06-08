// Create a Razorpay order for a fee payment. PARENT only, own child only.
// Validates the amount (≥ ₹100, ≤ pending) SERVER-SIDE — never trust the client's
// number — then creates the order + a CREATED PaymentTransaction row to track it.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getStudentPending } from "@/lib/fees";
import { createRazorpayOrder, razorpayConfigured } from "@/lib/razorpay";

const MIN_PAISE = 100 * 100; // ₹100

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  if (!razorpayConfigured()) return NextResponse.json({ error: "Online payments are not configured" }, { status: 503 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const { studentId, amount } = body as { studentId?: string; amount?: number };
  if (!studentId || typeof amount !== "number" || !Number.isFinite(amount)) {
    return NextResponse.json({ error: "studentId and amount are required" }, { status: 422 });
  }
  const amountPaise = Math.round(amount);
  if (amountPaise < MIN_PAISE) return NextResponse.json({ error: "Minimum payment is ₹100" }, { status: 422 });

  // Ownership + balance check, server-side.
  const fee = await getStudentPending(studentId, auth.id, auth.schoolId);
  if (!fee) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (fee.pending <= 0) return NextResponse.json({ error: "No pending balance" }, { status: 409 });
  if (amountPaise > fee.pending) return NextResponse.json({ error: "Amount exceeds the pending balance", pending: fee.pending }, { status: 422 });

  const order = await createRazorpayOrder(amountPaise, `fee_${studentId}_${Date.now()}`);
  // Track the attempt (status CREATED) before the parent even opens Checkout.
  await prisma.paymentTransaction.create({
    data: { amount: amountPaise, status: "CREATED", razorpayOrderId: order.id, studentId, parentId: auth.id, schoolId: auth.schoolId },
  });

  return NextResponse.json({ orderId: order.id, amount: amountPaise, currency: "INR", keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID });
}
