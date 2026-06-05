// Validation for broadcasts. The audience is a discriminated selection:
//   ALL / PARENTS / TEACHERS, or CLASSES with a list of {classId, sectionId?}.
import { z } from "zod";
import { MAX_FILES } from "@/lib/upload-constants";

export const TARGET_ROLES = ["ALL", "PARENTS", "TEACHERS", "CLASSES"] as const;

const attachmentSchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1),
  size: z.number().nonnegative(),
  type: z.string(),
});

// One selected class, optionally narrowed to a section.
export const classTargetSchema = z.object({
  classId: z.string().min(1),
  sectionId: z.string().optional().or(z.literal("")),
});

export const broadcastCreateSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    message: z.string().min(1, "Message is required"),
    targetRole: z.enum(TARGET_ROLES),
    classes: z.array(classTargetSchema).optional().default([]),
    urgent: z.boolean().optional().default(false),
    attachments: z.array(attachmentSchema).max(MAX_FILES).optional().default([]),
  })
  .superRefine((data, ctx) => {
    if (data.targetRole === "CLASSES" && (!data.classes || data.classes.length === 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["classes"], message: "Select at least one class" });
    }
  });

// The audience-preview request reuses the same selection (no title/message).
export const audienceSchema = z.object({
  targetRole: z.enum(TARGET_ROLES),
  classes: z.array(classTargetSchema).optional().default([]),
});

export type BroadcastCreateInput = z.infer<typeof broadcastCreateSchema>;
export type AudienceInput = z.infer<typeof audienceSchema>;
