// Validation for recording a fee payment. Used on BOTH the client (instant
// feedback) and the server (the authoritative check). The client collects the
// amount in RUPEES (what a human types); the server converts to paise and
// re-checks it against the live balance — see the race-condition note in lib/fees.ts.
import { z } from "zod";

export const PAYMENT_MODES = ["CASH", "ONLINE", "CHEQUE", "UPI"] as const;

export const paymentCreateSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  // z.coerce.number turns the form's string ("1200.50") into a number.
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  date: z.string().min(1, "Date is required"),
  mode: z.enum(PAYMENT_MODES, { message: "Select a payment mode" }),
  receiptNumber: z.string().min(1, "Receipt number is required"),
  notes: z.string().optional().or(z.literal("")),
});

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
