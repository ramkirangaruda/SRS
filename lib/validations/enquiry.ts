// Validation for enquiry create/update + status transitions.
import { z } from "zod";
import { ENQUIRY_STATUSES, ENQUIRY_SOURCES } from "@/lib/enquiry";

export const enquiryCreateSchema = z.object({
  parentName: z.string().min(1, "Parent name is required"),
  phone: z.string().min(7, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  childName: z.string().optional().or(z.literal("")),
  childAge: z.string().optional().or(z.literal("")),
  childGender: z.string().optional().or(z.literal("")),
  currentSchool: z.string().optional().or(z.literal("")),
  classInterestedIn: z.string().optional().or(z.literal("")),
  source: z.enum(ENQUIRY_SOURCES).optional(),
  categoryId: z.string().optional().or(z.literal("")),
  message: z.string().optional().or(z.literal("")),
  followUpDate: z.string().optional().or(z.literal("")),
});

export const statusChangeSchema = z.object({
  toStatus: z.enum(ENQUIRY_STATUSES),
  note: z.string().optional().or(z.literal("")),
  followUpDate: z.string().optional().or(z.literal("")),
  closureReason: z.string().optional().or(z.literal("")),
});

export const activitySchema = z.object({
  activityType: z.enum(["NOTE", "CALL", "FOLLOW_UP"]),
  note: z.string().min(1, "Note is required"),
  followUpDate: z.string().optional().or(z.literal("")),
});
