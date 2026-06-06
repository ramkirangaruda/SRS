// Validation for timetable period settings + cell edits. Shared client/server.
import { z } from "zod";
import { DAYS, PERIOD_TYPES } from "@/lib/timetable";

// "HH:MM" 24-hour time.
const timeRe = /^([01]\d|2[0-3]):[0-5]\d$/;

export const periodSchema = z.object({
  periodNumber: z.number().int().min(1),
  label: z.string().min(1, "Label required"),
  startTime: z.string().regex(timeRe, "Use HH:MM"),
  endTime: z.string().regex(timeRe, "Use HH:MM"),
  type: z.enum(PERIOD_TYPES),
});

export const savePeriodsSchema = z.object({
  periods: z.array(periodSchema).min(1, "Add at least one period"),
});

// One cell write. subjectId/teacherId null = clear the cell.
export const entrySchema = z.object({
  classId: z.string().min(1),
  sectionId: z.string().min(1),
  academicYearId: z.string().min(1),
  dayOfWeek: z.enum(DAYS),
  periodNumber: z.number().int().min(1),
  subjectId: z.string().nullable().optional(),
  teacherId: z.string().nullable().optional(),
});

export const copySchema = z.object({
  classId: z.string().min(1),
  fromSectionId: z.string().min(1),
  toSectionId: z.string().min(1),
  academicYearId: z.string().min(1),
});

export type PeriodInput = z.infer<typeof periodSchema>;
export type EntryInput = z.infer<typeof entrySchema>;
