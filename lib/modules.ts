// The catalogue of modules that a Branch can switch on/off, plus the helpers for
// reading/writing the stored list. This file is CLIENT-SAFE on purpose: it has no
// next/headers or Prisma imports, so both Server Components (nav gating) and
// Client Components (the Settings → Branches toggles) can import it. The
// server-only pieces (cookies + DB) live in lib/branches.ts.
//
// A "module" here maps 1:1 to a principal nav item. Dashboard and Settings are
// intentionally NOT in this list — they are always visible regardless of branch.

// The stable key for each toggleable module. Adding a module = add it here AND tag
// the matching nav item in lib/nav.ts with the same key.
export type ModuleKey =
  | "students"
  | "fees"
  | "attendance"
  | "homework"
  | "diary"
  | "broadcast"
  | "feedback"
  | "events"
  | "holidays"
  | "meals"
  | "gallery"
  | "videos"
  | "elearning"
  | "testreports"
  | "progressreports"
  | "timetable"
  | "virtualclassroom"
  | "meetingroom"
  | "planners"
  | "daycare"
  | "enquiry"
  | "admissions"
  | "visitors"
  | "staff"
  | "toddlers"
  | "tuitions";

// Display order + label for the Settings toggles. Order here is the order shown.
export const TOGGLEABLE_MODULES: { key: ModuleKey; label: string }[] = [
  { key: "toddlers", label: "Toddlers" },
  { key: "daycare", label: "Daycare" },
  { key: "tuitions", label: "Tuitions" },
  { key: "students", label: "Students" },
  { key: "fees", label: "Fees" },
  { key: "attendance", label: "Attendance" },
  { key: "homework", label: "Homework" },
  { key: "diary", label: "Diary" },
  { key: "broadcast", label: "Broadcast" },
  { key: "feedback", label: "Feedback" },
  { key: "events", label: "Events" },
  { key: "holidays", label: "Holidays" },
  { key: "meals", label: "Meals" },
  { key: "gallery", label: "Gallery" },
  { key: "videos", label: "Videos" },
  { key: "elearning", label: "E-Learning" },
  { key: "testreports", label: "Test Reports" },
  { key: "progressreports", label: "Progress Reports" },
  { key: "timetable", label: "Timetable" },
  { key: "virtualclassroom", label: "Virtual Classroom" },
  { key: "meetingroom", label: "Meeting Room" },
  { key: "planners", label: "Planners" },
  { key: "enquiry", label: "Enquiries" },
  { key: "admissions", label: "Admissions" },
  { key: "visitors", label: "Visitors" },
  { key: "staff", label: "Staff" },
];

const VALID_KEYS = new Set<string>(TOGGLEABLE_MODULES.map((m) => m.key));

// Branch.enabledModules is stored as a JSON string (codebase convention). Parse it
// defensively — bad/old data must never crash a page, just yield an empty list.
// We also drop any unknown keys so removing a module can't leave stale entries.
export function parseModules(json: string | null | undefined): ModuleKey[] {
  if (!json) return [];
  try {
    const arr = JSON.parse(json);
    if (!Array.isArray(arr)) return [];
    return arr.filter((k): k is ModuleKey => typeof k === "string" && VALID_KEYS.has(k));
  } catch {
    return [];
  }
}

// Serialize back to the stored JSON string, keeping only valid keys in catalogue
// order (so the stored value is stable/deterministic).
export function serializeModules(keys: ModuleKey[]): string {
  const set = new Set(keys);
  return JSON.stringify(TOGGLEABLE_MODULES.filter((m) => set.has(m.key)).map((m) => m.key));
}
