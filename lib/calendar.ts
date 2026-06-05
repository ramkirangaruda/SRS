// Calendar date utilities. Client-safe (no DB). EVERYTHING is keyed by a
// "YYYY-MM-DD" string derived from a date's UTC parts — never from local time —
// so a "June 10" event reads as June 10 in every timezone (see the timezone
// walkthrough). A "key" is the single source of truth for "which calendar day".

export const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const pad = (n: number) => String(n).padStart(2, "0");

// A Date (stored at UTC midnight) -> "YYYY-MM-DD" using its UTC parts.
export function dayKey(date: Date | string): string {
  if (typeof date === "string") return date.length > 10 ? date.slice(0, 10) : date;
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

// The viewer's LOCAL today, as a key (for "is this cell today?").
export function todayKey(): string {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

export function keyOf(year: number, month1: number, day: number): string {
  return `${year}-${pad(month1)}-${pad(day)}`;
}

export function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

// A key -> Date at UTC midnight (for storing / querying the DB).
export function dateUTCFromKey(key: string): Date {
  const { y, m, d } = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d));
}

export function monthLabel(year: number, month1: number): string {
  return `${MONTHS[month1 - 1]} ${year}`;
}

export function shortMonth(month1: number): string {
  return MONTHS[month1 - 1].slice(0, 3);
}

// Move a (year, month1) by delta months, wrapping correctly.
export function addMonths(year: number, month1: number, delta: number): { year: number; month: number } {
  const idx = (year * 12 + (month1 - 1)) + delta;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

// A grid cell. inMonth=false for the leading/trailing days from adjacent months.
export type GridCell = { key: string; day: number; inMonth: boolean };

// Build a 6-row x 7-col grid for a month: leading blanks aligned to the weekday
// the 1st falls on, then 1..N, then trailing days to complete the last week.
export function buildMonthGrid(year: number, month1: number): GridCell[] {
  const firstWeekday = new Date(Date.UTC(year, month1 - 1, 1)).getUTCDay(); // 0=Sun
  const daysInMonth = new Date(Date.UTC(year, month1, 0)).getUTCDate();
  const prevDays = new Date(Date.UTC(year, month1 - 1, 0)).getUTCDate();

  const cells: GridCell[] = [];
  // Leading days from the previous month (greyed).
  for (let i = firstWeekday - 1; i >= 0; i--) {
    const day = prevDays - i;
    const { year: py, month: pm } = addMonths(year, month1, -1);
    cells.push({ key: keyOf(py, pm, day), day, inMonth: false });
  }
  // This month.
  for (let day = 1; day <= daysInMonth; day++) cells.push({ key: keyOf(year, month1, day), day, inMonth: true });
  // Trailing days to fill to a multiple of 7 (and usually 42 total).
  let nextDay = 1;
  while (cells.length % 7 !== 0) {
    const { year: ny, month: nm } = addMonths(year, month1, 1);
    cells.push({ key: keyOf(ny, nm, nextDay), day: nextDay, inMonth: false });
    nextDay++;
  }
  return cells;
}

// Inclusive list of keys from startKey..endKey (capped). Used to spread a
// multi-day event/holiday across every day it covers.
export function keysBetween(startKey: string, endKey: string): string[] {
  const out: string[] = [];
  let cur = dateUTCFromKey(startKey).getTime();
  const end = dateUTCFromKey(endKey).getTime();
  let guard = 0;
  while (cur <= end && guard < 400) {
    out.push(dayKey(new Date(cur)));
    cur += 86400000;
    guard++;
  }
  return out;
}

// Whole-number day difference between two keys (b - a), by calendar date.
export function daysBetweenKeys(aKey: string, bKey: string): number {
  return Math.round((dateUTCFromKey(bKey).getTime() - dateUTCFromKey(aKey).getTime()) / 86400000);
}

// Pretty label for a key, e.g. "10 Jun 2026".
export function formatKey(key: string): string {
  const { y, m, d } = parseKey(key);
  return `${d} ${shortMonth(m)} ${y}`;
}
