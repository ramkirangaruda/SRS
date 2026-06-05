// Validation for events. Shared client + server.
import { z } from "zod";
import { EVENT_TYPES } from "@/lib/event-types";

const attachmentSchema = z.object({ url: z.string(), name: z.string(), size: z.number(), type: z.string() });

export const eventCreateSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional().or(z.literal("")),
    date: z.string().min(1, "Date is required"), // YYYY-MM-DD
    endDate: z.string().optional().or(z.literal("")),
    type: z.enum(EVENT_TYPES),
    targetRole: z.enum(["ALL", "CLASSES"]).default("ALL"),
    targetClassIds: z.array(z.string()).optional().default([]),
    attachments: z.array(attachmentSchema).optional().default([]),
    isRecurring: z.boolean().optional().default(false),
    recurrenceFreq: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]).optional(),
    recurrenceEnd: z.string().optional().or(z.literal("")),
  })
  .superRefine((d, ctx) => {
    if (d.endDate && d.endDate < d.date) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date must be after start" });
    if (d.isRecurring && !d.recurrenceFreq) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["recurrenceFreq"], message: "Choose a frequency" });
    if (d.targetRole === "CLASSES" && (!d.targetClassIds || d.targetClassIds.length === 0))
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["targetClassIds"], message: "Select at least one class" });
  });

export const eventUpdateSchema = eventCreateSchema;
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
