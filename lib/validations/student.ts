// Zod validation schemas for the Student forms/API. Defining them ONCE here and
// using them on BOTH the client (instant form feedback) and the server (the real
// security boundary — never trust the client) keeps the rules in perfect sync.
import { z } from "zod";

// The "create or link a parent" choice. A new student must either be linked to
// an EXISTING parent (by id) or have a NEW parent account created inline.
export const PARENT_MODES = ["existing", "new"] as const;

// Fields for creating a brand-new parent account alongside the student.
const newParentSchema = z.object({
  name: z.string().min(1, "Parent name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().min(1, "Parent phone is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// The base student fields (shared by create + update).
const studentBase = z.object({
  name: z.string().min(1, "Student name is required"),
  admissionNumber: z.string().min(1, "Admission number is required"),
  // HTML date inputs give us a "YYYY-MM-DD" string; we keep it as a string here
  // and convert to a Date on the server.
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.string().optional().or(z.literal("")),
  bloodGroup: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  photo: z.string().optional().or(z.literal("")),
  classId: z.string().min(1, "Please select a class"),
  sectionId: z.string().optional().or(z.literal("")),
});

// CREATE schema: base fields + the parent choice. `superRefine` lets us require
// different fields depending on parentMode (conditional validation).
export const studentCreateSchema = studentBase
  .extend({
    parentMode: z.enum(PARENT_MODES),
    parentId: z.string().optional().or(z.literal("")),
    newParent: newParentSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.parentMode === "existing") {
      if (!data.parentId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parentId"],
          message: "Please select a parent",
        });
      }
    } else {
      // mode === "new": the newParent object must be present and valid.
      if (!data.newParent) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newParent"],
          message: "New parent details are required",
        });
      }
    }
  });

// UPDATE schema: same student fields, but parent linkage isn't changed here
// (kept simple — editing reassigns class/section/personal info).
export const studentUpdateSchema = studentBase;

// TypeScript types inferred straight from the schemas — single source of truth.
export type StudentCreateInput = z.infer<typeof studentCreateSchema>;
export type StudentUpdateInput = z.infer<typeof studentUpdateSchema>;
