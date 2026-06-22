// Validation for the tuitions module. Money fields arrive as rupees (number or
// numeric string from the form) and are converted to paise in the route via
// toMinor().
import { z } from "zod";

const money = z.union([z.number(), z.string()]); // rupees; route converts to paise

export const batchSchema = z.object({
  name: z.string().min(1, "Name is required").max(120, "Name is too long"),
  subject: z.string().max(80).optional().or(z.literal("")),
  feeAmount: money.optional(),
  schedule: z.string().max(200).optional().or(z.literal("")),
  tutorId: z.string().optional().or(z.literal("")),
  isActive: z.boolean().optional(),
});

export const enrollSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
});

export const tuitionPaymentSchema = z.object({
  batchId: z.string().min(1),
  studentId: z.string().min(1),
  amount: money,
  mode: z.string().max(20).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  date: z.string().optional().or(z.literal("")),
});
