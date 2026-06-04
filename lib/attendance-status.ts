// Attendance status helpers with NO database imports, so Client Components can
// import them freely (client code must never import lib/attendance, which pulls
// in Prisma). One source of truth for the four statuses, their colors, and the
// percentage rule — used by the marking UI, reports, calendar, and parent views.

export const ATTENDANCE_STATUSES = ["PRESENT", "ABSENT", "LATE", "HALF_DAY"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

// Human label, e.g. "HALF_DAY" -> "Half Day".
export const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  ABSENT: "Absent",
  LATE: "Late",
  HALF_DAY: "Half Day",
};

// Tailwind classes for a SOLID swatch (used for selected toggle buttons + grid).
export const STATUS_BG: Record<AttendanceStatus, string> = {
  PRESENT: "bg-green-500 text-white",
  ABSENT: "bg-red-500 text-white",
  LATE: "bg-yellow-400 text-black",
  HALF_DAY: "bg-orange-500 text-white",
};

// Classes for a soft dot/cell (used in the calendar heat map).
export const STATUS_DOT: Record<AttendanceStatus, string> = {
  PRESENT: "bg-green-500",
  ABSENT: "bg-red-500",
  LATE: "bg-yellow-400",
  HALF_DAY: "bg-orange-500",
};

// Counts that summarize a stretch of days.
export type AttendanceCounts = {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  total: number; // total marked days
};

// THE PERCENTAGE RULE (documented in one place so it's consistent everywhere):
//   PRESENT = 1, LATE = 1 (present but tardy), HALF_DAY = 0.5, ABSENT = 0.
//   percentage = weightedPresentDays / totalMarkedDays * 100.
export function attendancePercent(c: AttendanceCounts): number {
  if (c.total <= 0) return 0;
  const weighted = c.present + c.late + c.halfDay * 0.5;
  return Math.round((weighted / c.total) * 100);
}

// Below this %, the parent view shows a "low attendance" warning.
export const LOW_ATTENDANCE_THRESHOLD = 75;
