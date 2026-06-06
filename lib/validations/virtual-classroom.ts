// Validation for virtual classroom create/update + recording. Shared.
//
// We validate the MEETING LINK is a real Zoom or Google Meet URL — a typo'd link
// wastes everyone's time at class start, so we catch it at entry. The regexes are
// intentionally loose (host + an id-ish path) rather than trying to match every
// Zoom URL variant exactly.
import { z } from "zod";
import { isValidMeetingLink } from "@/lib/meeting-links";

export const vcCreateSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().or(z.literal("")),
  meetingLink: z.string().url("Enter a valid URL").refine(isValidMeetingLink, "Must be a Zoom or Google Meet link"),
  scheduledAt: z.string().min(1, "Pick a date & time"),
  duration: z.coerce.number().int().min(5).max(360).optional(),
  classId: z.string().min(1, "Select a class"),
  sectionId: z.string().optional().or(z.literal("")),
  subjectId: z.string().optional().or(z.literal("")),
  hostId: z.string().optional().or(z.literal("")), // defaults to the creator
});

export const vcUpdateSchema = vcCreateSchema;

// A recording link is optional but, if present, should look like a URL.
export const recordingSchema = z.object({
  recordingUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
});

export type VCCreateInput = z.infer<typeof vcCreateSchema>;
