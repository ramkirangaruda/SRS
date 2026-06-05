// Validation for diary entries. Shared client + server.
import { z } from "zod";
import { MAX_FILES } from "@/lib/upload-constants";

const attachmentSchema = z.object({
  url: z.string().min(1),
  name: z.string().min(1),
  size: z.number().nonnegative(),
  type: z.string(),
});

export const diaryCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  classId: z.string().min(1, "Please select a class"),
  sectionId: z.string().optional().or(z.literal("")),
  date: z.string().min(1, "Date is required"), // YYYY-MM-DD (may be backdated)
  attachments: z.array(attachmentSchema).max(MAX_FILES).optional().default([]),
});

export const diaryUpdateSchema = diaryCreateSchema;
export type DiaryCreateInput = z.infer<typeof diaryCreateSchema>;
export type DiaryUpdateInput = z.infer<typeof diaryUpdateSchema>;
