// Timetable data layer.
//
// MODEL CHOICE (recap of the concept): we store the timetable as RELATIONAL ROWS
// (one TimetableEntry per class/section/day/period), not as a JSON blob. That's
// what lets us answer "is teacher X already booked at MON period 2?" with a
// single indexed query — the foundation of conflict detection. A JSON blob would
// force us to load and parse every class's timetable to answer the same question.
//
// Two tables:
//   • PeriodTemplate — the school-wide bell schedule (period 1 = 09:00–09:45 …).
//     Change a timing once here and every class's timetable follows.
//   • TimetableEntry — the actual assignment in each (class, section, day, period)
//     slot: which subject, taught by which teacher.
import { prisma } from "@/lib/prisma";

// Mon–Sat. We don't include Sunday (most Indian schools are closed). Order here
// is the column order in every grid.
export const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;
export type Day = (typeof DAYS)[number];
export const DAY_LABELS: Record<Day, string> = { MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday", FRI: "Friday", SAT: "Saturday" };

export const PERIOD_TYPES = ["CLASS", "BREAK", "ASSEMBLY"] as const;

const clean = (v?: string | null) => (v && v.trim() !== "" ? v : undefined);

// ---- PERIOD TEMPLATE (bell schedule) ----

export type Period = { id: string; periodNumber: number; label: string; startTime: string; endTime: string; type: string };

export async function listPeriods(schoolId: string): Promise<Period[]> {
  const rows = await prisma.periodTemplate.findMany({ where: { schoolId }, orderBy: { periodNumber: "asc" } });
  return rows.map((p) => ({ id: p.id, periodNumber: p.periodNumber, label: p.label, startTime: p.startTime, endTime: p.endTime, type: p.type }));
}

// Replace the whole bell schedule in one transaction. The settings slide-over
// sends the full ordered list, so we delete-then-recreate (simplest correct
// approach; the table is tiny). Entries reference periodNumber, not period id,
// so re-creating period rows doesn't break existing timetable entries.
export async function savePeriods(schoolId: string, periods: { periodNumber: number; label: string; startTime: string; endTime: string; type: string }[]) {
  await prisma.$transaction([
    prisma.periodTemplate.deleteMany({ where: { schoolId } }),
    prisma.periodTemplate.createMany({ data: periods.map((p) => ({ ...p, schoolId })) }),
  ]);
  return listPeriods(schoolId);
}

// ---- TIMETABLE GRID ----

export type Entry = {
  id: string;
  dayOfWeek: string;
  periodNumber: number;
  subjectId: string | null;
  subjectName: string | null;
  teacherId: string | null;
  teacherName: string | null;
  teacherActive: boolean; // false if the assigned teacher was deactivated
};

// Key for the per-cell lookup map the UI uses: "MON-2".
export const cellKey = (day: string, period: number) => `${day}-${period}`;

// Load the full grid for one class/section/year: periods + a flat entry list +
// a convenience map keyed by "DAY-period".
export async function getTimetable(schoolId: string, classId: string, sectionId: string, academicYearId: string) {
  const [periods, rows] = await Promise.all([
    listPeriods(schoolId),
    prisma.timetableEntry.findMany({
      where: { schoolId, classId, sectionId, academicYearId },
      include: { subject: { select: { name: true } }, teacher: { select: { name: true, isActive: true } } },
    }),
  ]);
  const entries: Entry[] = rows.map((r) => ({
    id: r.id,
    dayOfWeek: r.dayOfWeek,
    periodNumber: r.periodNumber,
    subjectId: r.subjectId,
    subjectName: r.subject?.name ?? null,
    teacherId: r.teacherId,
    teacherName: r.teacher?.name ?? null,
    teacherActive: r.teacher?.isActive ?? true,
  }));
  const byCell: Record<string, Entry> = {};
  for (const e of entries) byCell[cellKey(e.dayOfWeek, e.periodNumber)] = e;
  return { periods, entries, byCell };
}

// ---- CONFLICT DETECTION ----
//
// A "conflict" is a teacher double-booking: the SAME teacher assigned to two
// different class/section slots at the SAME day + period in the SAME year. A
// teacher can only be in one room at a time.
export type Conflict = { teacherId: string; teacherName: string; dayOfWeek: string; periodNumber: number; slots: { classId: string; className: string; sectionName: string }[] };

// Check ONE prospective assignment before we save it. Returns the clashing slots
// (excluding the cell we're editing) — empty array means no conflict.
//
// THIS is where the @@index([teacherId, dayOfWeek, periodNumber]) earns its keep:
// the database jumps straight to that teacher's rows for that exact day+period
// instead of scanning the whole table.
export async function checkConflict(params: {
  schoolId: string; academicYearId: string; teacherId: string;
  dayOfWeek: string; periodNumber: number; classId: string; sectionId: string;
}) {
  const clashes = await prisma.timetableEntry.findMany({
    where: {
      schoolId: params.schoolId,
      academicYearId: params.academicYearId,
      teacherId: params.teacherId,
      dayOfWeek: params.dayOfWeek,
      periodNumber: params.periodNumber,
      // Same teacher, same time, but a DIFFERENT class/section slot.
      NOT: { classId: params.classId, sectionId: params.sectionId },
    },
    include: { class: { select: { name: true } }, section: { select: { name: true } } },
  });
  return clashes.map((c) => ({ classId: c.classId, className: c.class?.name ?? "", sectionName: c.section?.name ?? "" }));
}

// Whole-school audit: every teacher double-booking, for the conflicts report.
// One query pulls all teacher-assigned entries; we group them in memory by
// (teacher, day, period) and flag any group with more than one slot.
export async function listConflicts(schoolId: string, academicYearId: string): Promise<Conflict[]> {
  const rows = await prisma.timetableEntry.findMany({
    where: { schoolId, academicYearId, teacherId: { not: null } },
    include: { teacher: { select: { name: true } }, class: { select: { name: true } }, section: { select: { name: true } } },
  });
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = `${r.teacherId}|${r.dayOfWeek}|${r.periodNumber}`;
    const a = groups.get(k) ?? [];
    a.push(r);
    groups.set(k, a);
  }
  const conflicts: Conflict[] = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue; // not a clash
    const first = group[0];
    conflicts.push({
      teacherId: first.teacherId!,
      teacherName: first.teacher?.name ?? "",
      dayOfWeek: first.dayOfWeek,
      periodNumber: first.periodNumber,
      slots: group.map((g) => ({ classId: g.classId, className: g.class?.name ?? "", sectionName: g.section?.name ?? "" })),
    });
  }
  return conflicts;
}

// ---- WRITE one cell ----
//
// Upsert by the unique slot (class, section, day, period, year). Passing a null
// subjectId clears the cell. We re-check the conflict server-side (never trust
// the client) and refuse to save a double-booking.
export async function setEntry(params: {
  schoolId: string; classId: string; sectionId: string; academicYearId: string;
  dayOfWeek: string; periodNumber: number; subjectId: string | null; teacherId: string | null;
}): Promise<{ ok: true } | { ok: false; conflict: { className: string; sectionName: string }[] }> {
  // Clearing the cell → delete the row if present.
  if (!params.subjectId && !params.teacherId) {
    await prisma.timetableEntry.deleteMany({
      where: { schoolId: params.schoolId, classId: params.classId, sectionId: params.sectionId, academicYearId: params.academicYearId, dayOfWeek: params.dayOfWeek, periodNumber: params.periodNumber },
    });
    return { ok: true };
  }

  if (params.teacherId) {
    const clash = await checkConflict({ schoolId: params.schoolId, academicYearId: params.academicYearId, teacherId: params.teacherId, dayOfWeek: params.dayOfWeek, periodNumber: params.periodNumber, classId: params.classId, sectionId: params.sectionId });
    if (clash.length) return { ok: false, conflict: clash };
  }

  await prisma.timetableEntry.upsert({
    where: { classId_sectionId_dayOfWeek_periodNumber_academicYearId: { classId: params.classId, sectionId: params.sectionId, dayOfWeek: params.dayOfWeek, periodNumber: params.periodNumber, academicYearId: params.academicYearId } },
    create: { schoolId: params.schoolId, classId: params.classId, sectionId: params.sectionId, academicYearId: params.academicYearId, dayOfWeek: params.dayOfWeek, periodNumber: params.periodNumber, subjectId: clean(params.subjectId) ?? null, teacherId: clean(params.teacherId) ?? null },
    update: { subjectId: clean(params.subjectId) ?? null, teacherId: clean(params.teacherId) ?? null },
  });
  return { ok: true };
}

// ---- COPY a section's timetable to another section of the same class ----
//
// "Section A is built; make B identical." We read A's entries and upsert them
// onto B (overwriting B's existing grid). Teacher conflicts are NOT auto-blocked
// here (the principal explicitly asked to clone) — the conflicts report will
// surface any double-bookings created, which they can then resolve.
export async function copyToSection(params: { schoolId: string; classId: string; fromSectionId: string; toSectionId: string; academicYearId: string }) {
  const source = await prisma.timetableEntry.findMany({ where: { schoolId: params.schoolId, classId: params.classId, sectionId: params.fromSectionId, academicYearId: params.academicYearId } });
  await prisma.$transaction([
    prisma.timetableEntry.deleteMany({ where: { schoolId: params.schoolId, classId: params.classId, sectionId: params.toSectionId, academicYearId: params.academicYearId } }),
    prisma.timetableEntry.createMany({
      data: source.map((s) => ({ schoolId: params.schoolId, classId: params.classId, sectionId: params.toSectionId, academicYearId: params.academicYearId, dayOfWeek: s.dayOfWeek, periodNumber: s.periodNumber, subjectId: s.subjectId, teacherId: s.teacherId })),
    }),
  ]);
  return source.length;
}

// ---- TEACHER timetable + workload ----

export type TeacherStats = { totalPeriods: number; freePeriods: number; busiestDay: string | null; maxConsecutive: number; overloaded: boolean };

// Build a teacher's personal timetable across all classes, plus workload stats.
// A teacher's grid is just "their" TimetableEntry rows — the index [teacherId,…]
// makes this lookup fast.
export async function getTeacherTimetable(teacherId: string, schoolId: string, academicYearId: string) {
  const [periods, rows] = await Promise.all([
    listPeriods(schoolId),
    prisma.timetableEntry.findMany({
      where: { schoolId, teacherId, academicYearId },
      include: { subject: { select: { name: true } }, class: { select: { name: true } }, section: { select: { name: true } } },
    }),
  ]);
  // CLASS periods only count toward workload (a break isn't teaching time).
  const classPeriods = periods.filter((p) => p.type === "CLASS");
  const byCell: Record<string, { subjectName: string | null; className: string; sectionName: string }> = {};
  for (const r of rows) {
    byCell[cellKey(r.dayOfWeek, r.periodNumber)] = { subjectName: r.subject?.name ?? null, className: r.class?.name ?? "", sectionName: r.section?.name ?? "" };
  }

  const totalSlots = DAYS.length * classPeriods.length;
  const totalPeriods = rows.length;
  const freePeriods = Math.max(0, totalSlots - totalPeriods);

  // Per-day load + the longest run of back-to-back CLASS periods on any single
  // day (a fatigue signal — we warn the principal if it exceeds 3).
  let busiestDay: string | null = null;
  let busiestCount = -1;
  let maxConsecutive = 0;
  for (const day of DAYS) {
    let dayCount = 0;
    let run = 0;
    for (const p of classPeriods) {
      const taught = !!byCell[cellKey(day, p.periodNumber)];
      if (taught) { dayCount++; run++; maxConsecutive = Math.max(maxConsecutive, run); } else { run = 0; }
    }
    if (dayCount > busiestCount) { busiestCount = dayCount; busiestDay = day; }
  }
  const stats: TeacherStats = { totalPeriods, freePeriods, busiestDay, maxConsecutive, overloaded: maxConsecutive > 3 };
  return { periods, byCell, stats };
}

// ---- DROPDOWN data ----

// Active teachers only — for assigning slots. Deactivated teachers are excluded
// from NEW assignments but their existing entries are preserved (teacherActive
// flag in Entry tells the UI to show them dimmed/with a warning).
export async function listActiveTeachers(schoolId: string) {
  return prisma.user.findMany({
    where: { schoolId, role: "TEACHER", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function listSubjectsForClass(schoolId: string, classId: string) {
  return prisma.subject.findMany({ where: { schoolId, classId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

export async function listAcademicYears(schoolId: string) {
  return prisma.academicYear.findMany({ where: { schoolId }, select: { id: true, name: true, isActive: true }, orderBy: { startDate: "desc" } });
}

// The active year's id (timetables default to it).
export async function activeYearId(schoolId: string): Promise<string | null> {
  const y = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true } });
  return y?.id ?? null;
}

// ---- PARENT view ----
//
// One child's class/section timetable. Ownership is structural: we resolve the
// child from (parentId, studentId) so a parent can never read another class.
export async function getParentTimetable(parentId: string, schoolId: string, studentId?: string) {
  const children = await prisma.student.findMany({
    where: { parentId, schoolId },
    select: { id: true, name: true, classId: true, sectionId: true, class: { select: { name: true } }, section: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  if (children.length === 0) return { children: [], selected: null, timetable: null };
  const child = (studentId && children.find((c) => c.id === studentId)) || children[0];
  const yearId = await activeYearId(schoolId);
  let timetable: Awaited<ReturnType<typeof getTimetable>> | null = null;
  if (child.sectionId && yearId) {
    timetable = await getTimetable(schoolId, child.classId, child.sectionId, yearId);
  }
  return {
    children: children.map((c) => ({ id: c.id, name: c.name, className: c.class?.name ?? null })),
    selected: { id: child.id, name: child.name, className: child.class?.name ?? null, sectionName: child.section?.name ?? null },
    timetable,
  };
}
