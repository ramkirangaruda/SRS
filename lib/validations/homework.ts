// Validation for creating/updating homework. Client + server share this. The
// due-date "must be in the future" rule is enforced here and re-checked server-side.
import { z } from "zod";
import { MAX_FILES } from "@/lib/upload-constants";

const attachmentSchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1),
  size: z.number().nonnegative(),
  type: z.string(),
});

// Today's date as a "YYYY-MM-DD" string (UTC) — the earliest allowed due date.
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export const homeworkCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().or(z.literal("")),
  classId: z.string().min(1, "Please select a class"),
  sectionId: z.string().optional().or(z.literal("")),
  subjectId: z.string().optional().or(z.literal("")),
  // Date-only string; must be today or later. String compare works for ISO dates.
  dueDate: z
    .string()
    .min(1, "Due date is required")
    .refine((d) => d >= todayStr(), "Due date must be in the future"),
  attachments: z.array(attachmentSchema).max(MAX_FILES).optional().default([]),
  notifyParents: z.boolean().optional().default(true),
});

// Update allows the same fields (attachments = the final desired set).
export const homeworkUpdateSchema = homeworkCreateSchema;

export type HomeworkCreateInput = z.infer<typeof homeworkCreateSchema>;
export type HomeworkUpdateInput = z.infer<typeof homeworkUpdateSchema>;
