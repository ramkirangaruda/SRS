// Daycare data layer.
//
// TIME STORAGE: check-in/out are real instants → stored as DateTime (a UTC point)
// and displayed in the viewer's local time. Activity/meal/nap "times" are
// time-of-day labels → stored as "HH:MM" strings (no date/zone needed). For a
// single-timezone school either approach works; we keep instants in UTC so the
// data stays correct if the school ever spans zones, and format on display.
//
// THE SYNC SAVE: the daycare form sends its ENTIRE current state; we replace the
// log's child rows (delete-all + create-all) inside ONE transaction. This makes
// saves idempotent and order-independent — the DB always ends up exactly matching
// the form, with no per-field diffing or partial-update bugs. The whole swap is
// atomic, so a mid-save crash never leaves half the activities applied.
import { prisma } from "@/lib/prisma";
import { dayKey, dateUTCFromKey, todayKey } from "@/lib/calendar";

export const MOODS = ["HAPPY", "OKAY", "UPSET", "SICK"] as const;
export const ACTIVITY_TYPES = ["FREE_PLAY", "ART_CRAFT", "STORY_TIME", "OUTDOOR", "MUSIC", "LEARNING", "OTHER"] as const;
export const MEAL_TYPES = ["BREAKFAST", "MORNING_SNACK", "LUNCH", "AFTERNOON_SNACK"] as const;
export const NAP_QUALITIES = ["SLEPT_WELL", "RESTLESS", "DIDNT_SLEEP"] as const;

export type DaycareStatus = "NOT_ARRIVED" | "CHECKED_IN" | "CHECKED_OUT";
export function statusOf(checkIn: Date | null, checkOut: Date | null): DaycareStatus {
  if (checkOut) return "CHECKED_OUT";
  if (checkIn) return "CHECKED_IN";
  return "NOT_ARRIVED";
}

const logInclude = { activities: { orderBy: { time: "asc" as const } }, meals: true, naps: true };

// All daycare-enrolled students + today's log status.
export async function listDaycareStudents(schoolId: string, dateKeyStr = todayKey()) {
  const date = dateUTCFromKey(dateKeyStr);
  const students = await prisma.student.findMany({
    where: { schoolId, isDaycare: true },
    select: { id: true, name: true, photo: true, class: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  const logs = await prisma.daycareLog.findMany({ where: { schoolId, date, studentId: { in: students.map((s) => s.id) } }, select: { studentId: true, checkInTime: true, checkOutTime: true, mood: true } });
  const byStudent = new Map(logs.map((l) => [l.studentId, l]));
  return students.map((s) => {
    const l = byStudent.get(s.id);
    return {
      id: s.id, name: s.name, photo: s.photo, className: s.class?.name ?? null,
      checkInTime: l?.checkInTime?.toISOString() ?? null, checkOutTime: l?.checkOutTime?.toISOString() ?? null,
      mood: l?.mood ?? null, status: statusOf(l?.checkInTime ?? null, l?.checkOutTime ?? null),
    };
  });
}

// Counts for the principal dashboard widget.
export async function daycareToday(schoolId: string) {
  const students = await listDaycareStudents(schoolId);
  return {
    total: students.length,
    checkedIn: students.filter((s) => s.status === "CHECKED_IN").length,
    checkedOut: students.filter((s) => s.status === "CHECKED_OUT").length,
    notArrived: students.filter((s) => s.status === "NOT_ARRIVED").length,
  };
}

async function ensureDaycareStudent(studentId: string, schoolId: string) {
  return prisma.student.findFirst({ where: { id: studentId, schoolId, isDaycare: true }, select: { id: true } });
}

// CHECK IN — records now as check-in. Idempotent-safe: refuses a second check-in.
export async function checkIn(studentId: string, schoolId: string, userId: string) {
  if (!(await ensureDaycareStudent(studentId, schoolId))) return { ok: false as const, error: "Not a daycare student" };
  const date = dateUTCFromKey(todayKey());
  const existing = await prisma.daycareLog.findUnique({ where: { studentId_date: { studentId, date } } });
  if (existing?.checkInTime) return { ok: false as const, error: "Already checked in today" };
  await prisma.daycareLog.upsert({
    where: { studentId_date: { studentId, date } },
    create: { studentId, date, checkInTime: new Date(), recordedById: userId, schoolId },
    update: { checkInTime: new Date() },
  });
  return { ok: true as const };
}

// CHECK OUT — requires an existing check-in first.
export async function checkOut(studentId: string, schoolId: string) {
  const date = dateUTCFromKey(todayKey());
  const log = await prisma.daycareLog.findUnique({ where: { studentId_date: { studentId, date } } });
  if (!log?.checkInTime) return { ok: false as const, error: "Student is not checked in" };
  if (log.checkOutTime) return { ok: false as const, error: "Already checked out" };
  await prisma.daycareLog.update({ where: { id: log.id }, data: { checkOutTime: new Date() } });
  return { ok: true as const };
}

export type FullLog = {
  id: string | null; date: string; checkInTime: string | null; checkOutTime: string | null; mood: string | null; generalNotes: string | null;
  activities: { time: string | null; activityType: string; activityName: string | null; notes: string | null }[];
  meals: { mealType: string; eaten: boolean; time: string | null; notes: string | null }[];
  naps: { startTime: string | null; endTime: string | null; quality: string | null }[];
  updatedAt: string | null;
};

export async function getLog(studentId: string, schoolId: string, dateKeyStr: string): Promise<FullLog> {
  const date = dateUTCFromKey(dateKeyStr);
  const log = await prisma.daycareLog.findFirst({ where: { studentId, schoolId, date }, include: logInclude });
  if (!log) return { id: null, date: dateKeyStr, checkInTime: null, checkOutTime: null, mood: null, generalNotes: null, activities: [], meals: [], naps: [], updatedAt: null };
  return {
    id: log.id, date: dateKeyStr,
    checkInTime: log.checkInTime?.toISOString() ?? null, checkOutTime: log.checkOutTime?.toISOString() ?? null,
    mood: log.mood, generalNotes: log.generalNotes,
    activities: log.activities.map((a) => ({ time: a.time, activityType: a.activityType, activityName: a.activityName, notes: a.notes })),
    meals: log.meals.map((m) => ({ mealType: m.mealType, eaten: m.eaten, time: m.time, notes: m.notes })),
    naps: log.naps.map((n) => ({ startTime: n.startTime, endTime: n.endTime, quality: n.quality })),
    updatedAt: log.updatedAt.toISOString(),
  };
}

// SYNC SAVE: upsert the parent log, then replace ALL child rows atomically.
export async function syncLog(studentId: string, schoolId: string, userId: string, dateKeyStr: string, data: {
  checkInTime?: string | null; checkOutTime?: string | null; mood?: string | null; generalNotes?: string | null;
  activities: { time?: string | null; activityType: string; activityName?: string | null; notes?: string | null }[];
  meals: { mealType: string; eaten: boolean; time?: string | null; notes?: string | null }[];
  naps: { startTime?: string | null; endTime?: string | null; quality?: string | null }[];
}) {
  if (!(await ensureDaycareStudent(studentId, schoolId))) return null;
  const date = dateUTCFromKey(dateKeyStr);

  return prisma.$transaction(async (tx) => {
    const log = await tx.daycareLog.upsert({
      where: { studentId_date: { studentId, date } },
      create: {
        studentId, date, recordedById: userId, schoolId,
        checkInTime: data.checkInTime ? new Date(data.checkInTime) : null,
        checkOutTime: data.checkOutTime ? new Date(data.checkOutTime) : null,
        mood: data.mood ?? null, generalNotes: data.generalNotes ?? null,
      },
      update: {
        checkInTime: data.checkInTime ? new Date(data.checkInTime) : null,
        checkOutTime: data.checkOutTime ? new Date(data.checkOutTime) : null,
        mood: data.mood ?? null, generalNotes: data.generalNotes ?? null,
      },
    });
    // Replace children: delete the old set, recreate from the incoming state.
    await tx.daycareActivity.deleteMany({ where: { daycareLogId: log.id } });
    await tx.daycareMeal.deleteMany({ where: { daycareLogId: log.id } });
    await tx.daycareNap.deleteMany({ where: { daycareLogId: log.id } });
    if (data.activities.length) await tx.daycareActivity.createMany({ data: data.activities.map((a) => ({ daycareLogId: log.id, time: a.time ?? null, activityType: a.activityType, activityName: a.activityName ?? null, notes: a.notes ?? null })) });
    if (data.meals.length) await tx.daycareMeal.createMany({ data: data.meals.map((m) => ({ daycareLogId: log.id, mealType: m.mealType, eaten: m.eaten, time: m.time ?? null, notes: m.notes ?? null })) });
    if (data.naps.length) await tx.daycareNap.createMany({ data: data.naps.map((n) => ({ daycareLogId: log.id, startTime: n.startTime ?? null, endTime: n.endTime ?? null, quality: n.quality ?? null })) });
    return log.id;
  });
}

// History for the calendar: logs in a range with mood for the colored dots.
export async function history(studentId: string, schoolId: string, fromKey: string, toKey: string) {
  const rows = await prisma.daycareLog.findMany({
    where: { studentId, schoolId, date: { gte: dateUTCFromKey(fromKey), lte: dateUTCFromKey(toKey) } },
    select: { date: true, mood: true, checkInTime: true, checkOutTime: true },
    orderBy: { date: "asc" },
  });
  return rows.map((r) => ({ date: dayKey(r.date), mood: r.mood, checkInTime: r.checkInTime?.toISOString() ?? null, checkOutTime: r.checkOutTime?.toISOString() ?? null }));
}

// ---- PARENT ----
// Ownership guard: the student must be this parent's daycare child.
export async function parentOwns(studentId: string, parentId: string, schoolId: string) {
  return !!(await prisma.student.findFirst({ where: { id: studentId, parentId, schoolId, isDaycare: true }, select: { id: true } }));
}

async function parentDaycareChildren(parentId: string, schoolId: string) {
  return prisma.student.findMany({ where: { parentId, schoolId, isDaycare: true }, select: { id: true, name: true, photo: true, class: { select: { name: true } } }, orderBy: { name: "asc" } });
}

export async function parentToday(parentId: string, schoolId: string) {
  const children = await parentDaycareChildren(parentId, schoolId);
  const today = todayKey();
  const logs = await Promise.all(children.map(async (c) => ({ child: c, log: await getLog(c.id, schoolId, today) })));
  return {
    enrolled: children.length > 0,
    children: logs.map(({ child, log }) => ({
      id: child.id, name: child.name, photo: child.photo, className: child.class?.name ?? null,
      status: statusOf(log.checkInTime ? new Date(log.checkInTime) : null, log.checkOutTime ? new Date(log.checkOutTime) : null),
      log,
    })),
    // A single "last updated" marker so the parent's poll can cheaply detect change.
    lastUpdated: logs.reduce<string | null>((mx, { log }) => (log.updatedAt && (!mx || log.updatedAt > mx) ? log.updatedAt : mx), null),
  };
}

// Weekly summary: avg check-in, total hours, common activities, eating pattern.
export async function weeklySummary(studentId: string, schoolId: string) {
  const to = todayKey();
  const fromDate = new Date(); fromDate.setDate(fromDate.getDate() - 6);
  const from = dayKey(fromDate);
  const logs = await prisma.daycareLog.findMany({
    where: { studentId, schoolId, date: { gte: dateUTCFromKey(from), lte: dateUTCFromKey(to) } },
    include: { activities: true, meals: true },
  });
  let checkInMinsSum = 0, checkInCount = 0, totalMs = 0;
  const activityCounts = new Map<string, number>();
  let mealsOffered = 0, mealsEaten = 0;
  for (const l of logs) {
    if (l.checkInTime) { checkInMinsSum += l.checkInTime.getHours() * 60 + l.checkInTime.getMinutes(); checkInCount++; }
    if (l.checkInTime && l.checkOutTime) totalMs += l.checkOutTime.getTime() - l.checkInTime.getTime();
    for (const a of l.activities) activityCounts.set(a.activityName ?? a.activityType, (activityCounts.get(a.activityName ?? a.activityType) ?? 0) + 1);
    for (const m of l.meals) { mealsOffered++; if (m.eaten) mealsEaten++; }
  }
  const avgMin = checkInCount ? Math.round(checkInMinsSum / checkInCount) : null;
  const avgCheckIn = avgMin != null ? `${String(Math.floor(avgMin / 60)).padStart(2, "0")}:${String(avgMin % 60).padStart(2, "0")}` : null;
  const topActivities = Array.from(activityCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name, count]) => ({ name, count }));
  return {
    daysAttended: logs.filter((l) => l.checkInTime).length,
    avgCheckIn, totalHours: Math.round((totalMs / 3_600_000) * 10) / 10,
    topActivities, eatingRate: mealsOffered ? Math.round((mealsEaten / mealsOffered) * 100) : null,
  };
}
