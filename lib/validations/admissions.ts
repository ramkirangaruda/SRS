// Validation for admission application create/update + approve/reject.
import { z } from "zod";
import { ADMISSION_SOURCES } from "@/lib/admissions";

const doc = z.object({ name: z.string(), type: z.string(), url: z.string() });

export const admissionCreateSchema = z.object({
  studentName: z.string().min(1, "Student name is required"),
  dateOfBirth: z.string().optional().or(z.literal("")),
  gender: z.string().optional().or(z.literal("")),
  bloodGroup: z.string().optional().or(z.literal("")),
  previousSchool: z.string().optional().or(z.literal("")),
  classAppliedFor: z.string().min(1, "Class is required"),
  parentName: z.string().optional().or(z.literal("")),
  motherName: z.string().optional().or(z.literal("")),
  phone: z.string().min(7, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  occupation: z.string().optional().or(z.literal("")),
  documents: z.array(doc).optional(),
  source: z.enum(ADMISSION_SOURCES).optional(),
  enquiryId: z.string().optional().or(z.literal("")),
});

export const approveSchema = z.object({
  classId: z.string().min(1, "Select a class"),
  sectionId: z.string().optional().or(z.literal("")),
});

export const rejectSchema = z.object({ reason: z.string().min(1, "Reason is required") });
