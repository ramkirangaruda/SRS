// Client-safe homework helpers (no DB imports). Used by cards and detail views
// in both the principal and parent UIs.
import type { StoredFile } from "@/lib/upload-constants";

// Safely parse the JSON attachments column into an array.
export function parseAttachments(json: string | null | undefined): StoredFile[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    return Array.isArray(arr) ? (arr as StoredFile[]) : [];
  } catch {
    return [];
  }
}

export type DueTone = "green" | "yellow" | "red" | "muted";

// THE DUE-DATE COUNTDOWN, and how timezone is handled:
// A due date is a CALENDAR DAY, not an instant. We stored it at UTC midnight, so
// its intended day = its UTC date parts. "Today" is the user's LOCAL calendar
// day. We compare the two as date-only values (ignoring time-of-day), which is
// what people mean by "due in 2 days" — and it avoids off-by-one errors that
// would happen if we compared raw timestamps across timezones.
export function dueInfo(due: string | Date, now: Date = new Date()): { label: string; tone: DueTone } {
  const d = typeof due === "string" ? new Date(due) : due;
  // Due day as a tz-neutral calendar value (from its UTC parts).
  const dueDay = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  // Today as the user's LOCAL calendar day.
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.round((dueDay - today) / 86400000);

  if (diffDays < 0) {
    const n = Math.abs(diffDays);
    return { label: n === 1 ? "Overdue by 1 day" : `Overdue by ${n} days`, tone: "red" };
  }
  if (diffDays === 0) return { label: "Due today", tone: "yellow" };
  if (diffDays === 1) return { label: "Due tomorrow", tone: "yellow" };
  if (diffDays <= 2) return { label: `Due in ${diffDays} days`, tone: "yellow" };
  return { label: `Due in ${diffDays} days`, tone: "green" };
}

// Tailwind text/bg classes for each tone.
export const DUE_TONE_CLASS: Record<DueTone, string> = {
  green: "text-green-700 bg-green-50",
  yellow: "text-amber-700 bg-amber-50",
  red: "text-red-700 bg-red-50",
  muted: "text-muted-foreground bg-muted",
};
