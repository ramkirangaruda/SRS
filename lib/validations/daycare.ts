// Validation for the daycare sync save. The form sends the whole log state.
import { z } from "zod";
import { MOODS, ACTIVITY_TYPES, MEAL_TYPES, NAP_QUALITIES } from "@/lib/daycare";

export const daycareLogSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bad date"),
  checkInTime: z.string().nullable().optional(),
  checkOutTime: z.string().nullable().optional(),
  mood: z.enum(MOODS).nullable().optional(),
  generalNotes: z.string().nullable().optional(),
  activities: z.array(z.object({
    time: z.string().nullable().optional(),
    activityType: z.enum(ACTIVITY_TYPES),
    activityName: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })).default([]),
  meals: z.array(z.object({
    mealType: z.enum(MEAL_TYPES),
    eaten: z.boolean(),
    time: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })).default([]),
  naps: z.array(z.object({
    startTime: z.string().nullable().optional(),
    endTime: z.string().nullable().optional(),
    quality: z.enum(NAP_QUALITIES).nullable().optional(),
  })).default([]),
});

export type DaycareLogInput = z.infer<typeof daycareLogSchema>;
