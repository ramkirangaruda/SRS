// "Pay Now" → a bottom sheet to choose the amount → Razorpay Checkout → verify.
//
// FLOW: enter amount (default = full pending, partial allowed, min ₹100) →
// /api/fees/create-order (server caps the amount) → open Razorpay Checkout with
// the order → on success, /api/fees/verify-payment (server checks the HMAC
// signature before recording) → success screen + refresh. On dismiss/failure we
// tell the parent nothing was charged.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CreditCard, CheckCircle2, Loader2 } from "lucide-react";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

// Razorpay Checkout is loaded from their script (see the parent fees page).
type RazorpayOptions = {
  key: string; amount: number; currency: string; order_id: string; name: string; description?: string; image?: string;
  prefill?: { email?: string; contact?: string }; theme?: { color?: string };
  handler: (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  modal?: { ondismiss?: () => void };
};
declare global { interface Window { Razorpay?: new (o: RazorpayOptions) => { open: () => void } } }

type Props = {
  studentId: string; studentName: string; pending: number; // paise
  schoolName: string; schoolLogo: string | null; parentEmail: string | null; parentPhone: string | null;
};

export function PayNowButton({ studentId, studentName, pending, schoolName, schoolLogo, parentEmail, parentPhone }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rupees, setRupees] = useState(String(Math.round(pending / 100)));
  const [stage, setStage] = useState<"form" | "processing" | "success">("form");
  const [success, setSuccess] = useState<{ paymentId: string; amount: number } | null>(null);

  if (pending <= 0) return null;

  function reset() { setStage("form"); setSuccess(null); setRupees(String(Math.round(pending / 100))); }

  async function pay() {
    const paise = Math.round(Number(rupees) * 100);
    if (!Number.isFinite(paise) || paise < 10000) { toast.error("Minimum payment is ₹100"); return; }
    if (paise > pending) { toast.error("Amount exceeds the pending balance"); return; }
    if (!window.Razorpay) { toast.error("Payment library not loaded — please refresh"); return; }

    setStage("processing");
    try {
      // 1. Create the order on our server (validates the amount again).
      const res = await fetch("/api/fees/create-order", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId, amount: paise }) });
      if (!res.ok) { const j = await res.json(); toast.error(j.error ?? "Could not start payment"); setStage("form"); return; }
      const order = await res.json();

      // 2. Open Razorpay Checkout.
      const rzp = new window.Razorpay({
        key: order.keyId, amount: order.amount, currency: order.currency, order_id: order.orderId,
        name: schoolName, description: `Fee payment · ${studentName}`, image: schoolLogo ?? undefined,
        prefill: { email: parentEmail ?? undefined, contact: parentPhone ?? undefined },
        theme: { color: "#0f172a" },
        handler: async (resp) => {
          // 3. Verify on our server — only a genuine signature records the payment.
          const v = await fetch("/api/fees/verify-payment", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(resp) });
          if (!v.ok) { const j = await v.json(); toast.error(j.error ?? "Verification failed"); setStage("form"); return; }
          const data = await v.json();
          setSuccess({ paymentId: data.paymentId, amount: data.amount }); setStage("success");
          router.refresh(); // pull fresh fee balances
        },
        modal: { ondismiss: () => { setStage("form"); toast.message("Payment was not completed. No amount was charged."); } },
      });
      rzp.open();
    } catch {
      toast.error("Payment was not completed. No amount was charged.");
      setStage("form");
    }
  }

  return (
    <>
      <Button size="sm" className="w-full" onClick={() => { reset(); setOpen(true); }}>
        <CreditCard className="mr-1 h-4 w-4" /> Pay Now · {formatINR(pending)}
      </Button>

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <SheetContent side="bottom" className="mx-auto max-w-md">
          {stage === "success" && success ? (
            <div className="space-y-3 py-4 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <SheetTitle>Payment successful</SheetTitle>
              <p className="text-sm text-muted-foreground">{formatINR(success.amount)} paid for {studentName}.</p>
              <p className="text-xs text-muted-foreground">Payment ID: <code className="rounded bg-muted px-1">{success.paymentId}</code></p>
              <Button className="w-full" onClick={() => setOpen(false)}>Done</Button>
            </div>
          ) : (
            <>
              <SheetHeader>
                <SheetTitle>Pay fees · {studentName}</SheetTitle>
                <SheetDescription>Pending balance: {formatINR(pending)}. You can pay in full or part (min ₹100).</SheetDescription>
              </SheetHeader>
              <div className="space-y-3 py-4">
                <div className="space-y-1">
                  <Label className="text-xs">Amount to pay (₹)</Label>
                  <Input type="number" inputMode="numeric" min={100} max={Math.round(pending / 100)} value={rupees} onChange={(e) => setRupees(e.target.value)} disabled={stage === "processing"} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setRupees(String(Math.round(pending / 100)))} disabled={stage === "processing"}>Full amount</Button>
                </div>
                <Button className="w-full" onClick={pay} disabled={stage === "processing"}>
                  {stage === "processing" ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Starting…</> : <>Continue to pay</>}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">Secured by Razorpay · test mode</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
