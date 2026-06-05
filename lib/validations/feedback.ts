// Validation for feedback create/reply/close/bulk. Shared client + server.
import { z } from "zod";
import { MAX_FILES } from "@/lib/upload-constants";
import { FEEDBACK_CATEGORIES } from "@/lib/feedback-categories";
import { FEEDBACK_STATUSES } from "@/lib/feedback-state";

const attachmentSchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1),
  size: z.number().nonnegative(),
  type: z.string(),
});

export const feedbackCreateSchema = z.object({
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(1, "Message is required"),
  category: z.enum(FEEDBACK_CATEGORIES).optional(),
  isAnonymous: z.boolean().optional().default(false),
  attachments: z.array(attachmentSchema).max(MAX_FILES).optional().default([]),
});

export const feedbackReplySchema = z.object({
  message: z.string().min(1, "Message is required"),
  attachments: z.array(attachmentSchema).max(MAX_FILES).optional().default([]),
});

export const feedbackCloseSchema = z.object({
  closingNote: z.string().optional().or(z.literal("")),
});

// Bulk: set status and/or category on one ticket (the UI loops over selected ids).
export const feedbackBulkSchema = z.object({
  status: z.enum(FEEDBACK_STATUSES).optional(),
  category: z.enum(FEEDBACK_CATEGORIES).optional(),
});

export type FeedbackCreateInput = z.infer<typeof feedbackCreateSchema>;
export type FeedbackReplyInput = z.infer<typeof feedbackReplySchema>;
