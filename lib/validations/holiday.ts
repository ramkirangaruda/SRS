import { z } from "zod";
import { HOLIDAY_TYPES } from "@/lib/holidays";

export const holidayCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  date: z.string().min(1, "Date is required"),
  endDate: z.string().optional().or(z.literal("")),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(HOLIDAY_TYPES).default("OTHER"),
});

// Bulk: an array of {name, date, type}. type defaults to OTHER if unknown.
export const holidayBulkSchema = z.object({
  rows: z.array(z.object({ name: z.string().min(1), date: z.string().min(1), type: z.string() })).min(1, "No rows"),
});

export type HolidayCreateInput = z.infer<typeof holidayCreateSchema>;
