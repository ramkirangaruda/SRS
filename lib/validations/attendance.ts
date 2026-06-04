// Validation for marking attendance. Runs on the client (instant feedback) and
// the server (authoritative). The records array holds one entry per student.
import { z } from "zod";
import { ATTENDANCE_STATUSES } from "@/lib/attendance-status";

export const attendanceRecordSchema = z.object({
  studentId: z.string().min(1),
  status: z.enum(ATTENDANCE_STATUSES),
  note: z.string().optional().or(z.literal("")),
});

export const markAttendanceSchema = z.object({
  date: z.string().min(1, "Date is required"), // "YYYY-MM-DD"
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().min(1, "Section is required"),
  records: z.array(attendanceRecordSchema).min(1, "No students to mark"),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;
