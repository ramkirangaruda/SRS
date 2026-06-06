// Validation for creating/updating staff. Shared client/server.
import { z } from "zod";
import { STAFF_STATUSES } from "@/lib/staff";

export const staffCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  phone: z.string().optional().or(z.literal("")),
  designation: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
  employeeId: z.string().optional().or(z.literal("")),
  qualification: z.string().optional().or(z.literal("")),
  experience: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  dateOfBirth: z.string().optional().or(z.literal("")),
  joiningDate: z.string().optional().or(z.literal("")),
  salary: z.coerce.number().nonnegative().optional().nullable(),
  allowances: z.coerce.number().nonnegative().optional().nullable(),
});

// Update: same fields minus email (login email is immutable here), plus status.
export const staffUpdateSchema = staffCreateSchema.omit({ email: true }).extend({
  status: z.enum(STAFF_STATUSES).optional(),
});

export type StaffCreateInput = z.infer<typeof staffCreateSchema>;
export type StaffUpdateInput = z.infer<typeof staffUpdateSchema>;
