// Validation for the toddler roster. Only the name is required; everything else is
// optional. Phone, when given, must be 10 digits (matches the rest of the app).
import { z } from "zod";

const optionalPhone = z
  .string()
  .regex(/^\d{10}$/, "Enter a 10-digit phone number")
  .optional()
  .or(z.literal(""));

export const toddlerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name is too long"),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional().or(z.literal("")),
  photo: z.string().optional().or(z.literal("")),
  guardianName: z.string().max(100).optional().or(z.literal("")),
  guardianPhone: optionalPhone,
  allergies: z.string().max(500).optional().or(z.literal("")),
  medicalNotes: z.string().max(1000).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
  parentId: z.string().optional().or(z.literal("")),
});

export type ToddlerFormValues = z.infer<typeof toddlerSchema>;
