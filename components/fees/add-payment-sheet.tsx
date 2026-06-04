// The "Add Payment" slide-over. Shows the student's name + current balance
// (read-only), then the payment fields. On submit it calls onSubmit (provided by
// FeesView), which performs the optimistic update + API call and returns a
// result so this sheet knows whether to close or show an error.
"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { paymentCreateSchema, type PaymentCreateInput, PAYMENT_MODES } from "@/lib/validations/fee";
import type { StudentFeeRow } from "@/lib/fees";
import { formatINR, toMinor } from "@/lib/money";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  row: StudentFeeRow | null; // the student we're collecting for (null = closed)
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: PaymentCreateInput) => Promise<{ ok: boolean; error?: string }>;
};

const today = () => new Date().toISOString().slice(0, 10);

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function AddPaymentSheet({ row, open, onOpenChange, onSubmit }: Props) {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PaymentCreateInput>({
    resolver: zodResolver(paymentCreateSchema),
    defaultValues: {
      studentId: "",
      amount: undefined as unknown as number,
      date: today(),
      mode: "CASH",
      receiptNumber: "",
      notes: "",
    },
  });

  // When a new row opens, reset the form for that student with a fresh receipt
  // suggestion and today's date.
  useEffect(() => {
    if (row && open) {
      reset({
        studentId: row.id,
        amount: undefined as unknown as number,
        date: today(),
        mode: "CASH",
        receiptNumber: `RCPT-${Date.now().toString().slice(-8)}`,
        notes: "",
      });
      setSubmitError(null);
    }
  }, [row, open, reset]);

  const mode = watch("mode");

  async function submit(values: PaymentCreateInput) {
    setSubmitError(null);
    // Client-side balance guard (UX). The server re-checks authoritatively.
    if (row && toMinor(values.amount) > row.pending) {
      setSubmitError(`Amount exceeds the pending balance (${formatINR(row.pending)}).`);
      return;
    }
    const result = await onSubmit(values);
    if (!result.ok) {
      setSubmitError(result.error ?? "Failed to record payment.");
      return;
    }
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Add Payment</SheetTitle>
          <SheetDescription>Record a fee payment for this student.</SheetDescription>
        </SheetHeader>

        {row && (
          // Read-only context: who + how much is left.
          <div className="my-4 rounded-md border bg-muted/40 p-3">
            <p className="font-medium">{row.name}</p>
            <p className="text-sm text-muted-foreground">
              {row.admissionNumber} · Class {row.className ?? "—"}
              {row.sectionName ? ` · ${row.sectionName}` : ""}
            </p>
            <p className="mt-2 text-sm">
              Current balance: <span className="font-semibold text-red-700">{formatINR(row.pending)}</span>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (₹) *</Label>
            <Input id="amount" type="number" step="0.01" min="0" {...register("amount")} />
            <FieldError message={errors.amount?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="date">Date *</Label>
            <Input id="date" type="date" {...register("date")} />
            <FieldError message={errors.date?.message} />
          </div>

          <div className="space-y-1.5">
            <Label>Payment mode *</Label>
            <Select value={mode} onValueChange={(v) => setValue("mode", v as PaymentCreateInput["mode"])}>
              <SelectTrigger>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m.charAt(0) + m.slice(1).toLowerCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError message={errors.mode?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receiptNumber">Receipt number *</Label>
            <Input id="receiptNumber" {...register("receiptNumber")} />
            <FieldError message={errors.receiptNumber?.message} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>

          {submitError && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Record Payment"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
