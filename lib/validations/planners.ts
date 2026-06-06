// Validation for planners + resources. Shared client/server.
import { z } from "zod";
import { PLANNER_TYPES, RESOURCE_TYPES } from "@/lib/planners";

export const plannerSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(PLANNER_TYPES),
  classId: z.string().optional().or(z.literal("")),
  subjectId: z.string().optional().or(z.literal("")),
  fileUrl: z.string().optional().or(z.literal("")),
  fileName: z.string().optional().or(z.literal("")),
});

export const resourceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(RESOURCE_TYPES),
  subjectId: z.string().optional().or(z.literal("")),
  fileUrl: z.string().optional().or(z.literal("")),
  externalUrl: z.string().optional().or(z.literal("")),
  fileName: z.string().optional().or(z.literal("")),
  fileSize: z.number().optional().nullable(),
  fileType: z.string().optional().or(z.literal("")),
  isPublic: z.boolean().optional().default(false),
});

export const resourceUpdateSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().or(z.literal("")),
  type: z.enum(RESOURCE_TYPES),
  subjectId: z.string().optional().or(z.literal("")),
  isPublic: z.boolean().optional(),
});
