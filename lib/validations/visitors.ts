// Validation for the visitors register. Phone must be exactly 10 digits.
import { z } from "zod";
import { PURPOSES, ID_PROOF_TYPES } from "@/lib/visitors";

const phone = z.string().regex(/^\d{10}$/, "Enter a 10-digit phone number");

export const visitorCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone,
  purpose: z.enum(PURPOSES),
  purposeOther: z.string().optional().or(z.literal("")),
  visitingWhomId: z.string().optional().or(z.literal("")),
  checkInTime: z.string().optional().or(z.literal("")),
  idProofType: z.enum(ID_PROOF_TYPES).optional().or(z.literal("")),
  idNumber: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const visitorUpdateSchema = visitorCreateSchema.extend({
  checkOutTime: z.string().optional().or(z.literal("")),
});
