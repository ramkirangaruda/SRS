// Events data layer. The headline feature is RECURRING EVENT EXPANSION:
//
// We store ONE row per event plus a recurrence RULE (freq + end). We do NOT
// store a row per occurrence. At read time, for the requested window, we EXPAND
// the rule into concrete occurrences. Tradeoffs:
//   • One-row + rule  → tiny storage, "edit the series" is one update, but
//     deleting a single occurrence needs an exception list (excludedDates).
//   • Row-per-occurrence → easy single edits, but bloats the DB and "edit all"
//     means touching thousands of rows. For school calendars the rule approach
//     is the right call — that's what we do here.
import { prisma } from "@/lib/prisma";
import { parseAttachments } from "@/lib/homework-format";
import { dayKey, dateUTCFromKey, daysBetweenKeys, keyOf, parseKey } from "@/lib/calendar";
import type { StoredFile } from "@/lib/upload-constants";
import type { EventCreateInput } from "@/lib/validations/event";

export type EventOccurrence = {
  id: string; // base event id (occurrences share it)
  title: string;
  description: string | null;
  type: string;
  date: string; // occurrence start (ISO @ UTC midnight)
  endDate: string | null;
  isRecurring: boolean;
  occurrenceKey: string; // this occurrence's start key (for per-occurrence delete)
  attachments: StoredFile[];
  targetRole: string;
};

type EventRow = {
  id: string; title: string; description: string | null; type: string;
  date: Date; endDate: Date | null; isRecurring: boolean;
  recurrenceFreq: string | null; recurrenceEnd: Date | null; excludedDates: string | null;
  attachments: string | null; targetRole: string;
};

// Advance a key by one recurrence step.
function advanceKey(key: string, freq: string): string {
  const { y, m, d } = parseKey(key);
  if (freq === "WEEKLY") return dayKey(new Date(Date.UTC(y, m - 1, d + 7)));
  if (freq === "MONTHLY") return dayKey(new Date(Date.UTC(y, m, d)));
  return dayKey(new Date(Date.UTC(y + 1, m - 1, d))); // YEARLY
}
function addDaysKey(key: string, days: number): string {
  const { y, m, d } = parseKey(key);
  return dayKey(new Date(Date.UTC(y, m - 1, d + days)));
}

// Expand one event row into the occurrences that fall within [startKey, endKey].
function expand(row: EventRow, startKey: string, endKey: string): EventOccurrence[] {
  const base = {
    id: row.id, title: row.title, description: row.description, type: row.type,
    isRecurring: row.isRecurring, attachments: parseAttachments(row.attachments), targetRole: row.targetRole,
  };
  const startDayKey = dayKey(row.date);
  const span = row.endDate ? daysBetweenKeys(startDayKey, dayKey(row.endDate)) : 0;

  if (!row.isRecurring) {
    const occEnd = span > 0 ? addDaysKey(startDayKey, span) : startDayKey;
    if (occEnd >= startKey && startDayKey <= endKey) {
      return [{ ...base, date: dateUTCFromKey(startDayKey).toISOString(), endDate: span > 0 ? dateUTCFromKey(occEnd).toISOString() : null, occurrenceKey: startDayKey }];
    }
    return [];
  }

  const excluded = new Set<string>(row.excludedDates ? (JSON.parse(row.excludedDates) as string[]) : []);
  const recEndKey = row.recurrenceEnd ? dayKey(row.recurrenceEnd) : endKey;
  const out: EventOccurrence[] = [];
  let cur = startDayKey;
  let guard = 0;
  while (cur <= endKey && cur <= recEndKey && guard < 500) {
    const occEnd = span > 0 ? addDaysKey(cur, span) : cur;
    if (occEnd >= startKey && !excluded.has(cur)) {
      out.push({ ...base, date: dateUTCFromKey(cur).toISOString(), endDate: span > 0 ? dateUTCFromKey(occEnd).toISOString() : null, occurrenceKey: cur });
    }
    cur = advanceKey(cur, row.recurrenceFreq ?? "WEEKLY");
    guard++;
  }
  return out;
}

function monthRangeKeys(year: number, month: number) {
  const startKey = keyOf(year, month, 1);
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { startKey, endKey: keyOf(year, month, daysInMonth) };
}

// Events overlapping a month (expanded). Optional type filter.
export async function listEventsForMonth(schoolId: string, year: number, month: number, type?: string): Promise<EventOccurrence[]> {
  const { startKey, endKey } = monthRangeKeys(year, month);
  const rows = await prisma.event.findMany({
    where: { schoolId, date: { lte: dateUTCFromKey(endKey) }, ...(type ? { type } : {}) },
  });
  return rows.flatMap((r) => expand(r as EventRow, startKey, endKey)).sort((a, b) => a.occurrenceKey.localeCompare(b.occurrenceKey));
}

// Next `days` of events (expanded), from today.
export async function listUpcoming(schoolId: string, days = 30, opts?: { classIds?: string[] }): Promise<EventOccurrence[]> {
  const now = new Date();
  const startKey = dayKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())));
  const endKey = addDaysKey(startKey, days);
  let rows = await prisma.event.findMany({ where: { schoolId, date: { lte: dateUTCFromKey(endKey) } } });
  rows = filterByAudience(rows, opts?.classIds);
  return rows.flatMap((r) => expand(r as EventRow, startKey, endKey)).sort((a, b) => a.occurrenceKey.localeCompare(b.occurrenceKey));
}

// Keep events targeted to ALL, or to CLASSES that intersect the given classIds.
// Generic so it returns the same row type it received (no field widening).
function filterByAudience<T extends { targetRole: string; targetClassIds: string | null }>(rows: T[], classIds?: string[]): T[] {
  if (!classIds) return rows;
  const mine = new Set(classIds);
  return rows.filter((r) => {
    if (r.targetRole !== "CLASSES") return true;
    const targets: string[] = r.targetClassIds ? JSON.parse(r.targetClassIds) : [];
    return targets.some((c) => mine.has(c));
  });
}

// Parent: events for a month, scoped to ALL + the parent's children's classes.
export async function listParentEventsForMonth(parentId: string, schoolId: string, year: number, month: number, type?: string) {
  const children = await prisma.student.findMany({ where: { parentId, schoolId }, select: { classId: true } });
  const classIds = Array.from(new Set(children.map((c) => c.classId)));
  const { startKey, endKey } = monthRangeKeys(year, month);
  let rows = await prisma.event.findMany({ where: { schoolId, date: { lte: dateUTCFromKey(endKey) }, ...(type ? { type } : {}) } });
  rows = filterByAudience(rows, classIds);
  return rows.flatMap((r) => expand(r as EventRow, startKey, endKey)).sort((a, b) => a.occurrenceKey.localeCompare(b.occurrenceKey));
}

export async function getEvent(id: string, schoolId: string) {
  const r = await prisma.event.findFirst({ where: { id, schoolId } });
  if (!r) return null;
  return {
    ...r,
    date: r.date.toISOString(),
    endDate: r.endDate?.toISOString() ?? null,
    recurrenceEnd: r.recurrenceEnd?.toISOString() ?? null,
    attachments: parseAttachments(r.attachments),
    targetClassIds: r.targetClassIds ? (JSON.parse(r.targetClassIds) as string[]) : [],
  };
}

export async function createEvent(input: EventCreateInput, schoolId: string) {
  return prisma.event.create({
    data: {
      title: input.title,
      description: input.description || null,
      date: dateUTCFromKey(input.date),
      endDate: input.endDate ? dateUTCFromKey(input.endDate) : null,
      type: input.type,
      attachments: JSON.stringify(input.attachments ?? []),
      targetRole: input.targetRole,
      targetClassIds: input.targetRole === "CLASSES" ? JSON.stringify(input.targetClassIds ?? []) : null,
      isRecurring: input.isRecurring ?? false,
      recurrenceFreq: input.isRecurring ? input.recurrenceFreq ?? null : null,
      recurrenceEnd: input.isRecurring && input.recurrenceEnd ? dateUTCFromKey(input.recurrenceEnd) : null,
      schoolId,
    },
  });
}

export async function updateEvent(id: string, input: EventCreateInput, schoolId: string) {
  const r = await prisma.event.updateMany({
    where: { id, schoolId },
    data: {
      title: input.title,
      description: input.description || null,
      date: dateUTCFromKey(input.date),
      endDate: input.endDate ? dateUTCFromKey(input.endDate) : null,
      type: input.type,
      attachments: JSON.stringify(input.attachments ?? []),
      targetRole: input.targetRole,
      targetClassIds: input.targetRole === "CLASSES" ? JSON.stringify(input.targetClassIds ?? []) : null,
      isRecurring: input.isRecurring ?? false,
      recurrenceFreq: input.isRecurring ? input.recurrenceFreq ?? null : null,
      recurrenceEnd: input.isRecurring && input.recurrenceEnd ? dateUTCFromKey(input.recurrenceEnd) : null,
    },
  });
  return r.count > 0;
}

// Delete: scope "all" removes the row; scope "occurrence" adds the date to the
// recurring event's excludedDates so just that one instance disappears.
export async function deleteEvent(id: string, schoolId: string, scope: "all" | "occurrence", occurrenceKey?: string) {
  const ev = await prisma.event.findFirst({ where: { id, schoolId }, select: { id: true, isRecurring: true, excludedDates: true } });
  if (!ev) return false;
  if (scope === "occurrence" && ev.isRecurring && occurrenceKey) {
    const excluded: string[] = ev.excludedDates ? JSON.parse(ev.excludedDates) : [];
    if (!excluded.includes(occurrenceKey)) excluded.push(occurrenceKey);
    await prisma.event.update({ where: { id: ev.id }, data: { excludedDates: JSON.stringify(excluded) } });
    return true;
  }
  await prisma.event.delete({ where: { id: ev.id } });
  return true;
}
