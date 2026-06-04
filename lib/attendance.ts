// Attendance data layer. All DB access for attendance lives here, scoped by
// schoolId (and parentId for the parent functions). Dates are normalized to UTC
// midnight so "a day" is unambiguous and the @@unique([studentId, date]) index
// holds one record per student per day.
import { prisma } from "@/lib/prisma";
import {
  type AttendanceStatus,
  type AttendanceCounts,
  attendancePercent,
} from "@/lib/attendance-status";

// Typed error so routes can map to HTTP statuses.
export class AttendanceError extends Error {
  constructor(public code: "INVALID_STUDENTS" | "NOT_FOUND", message: string) {
    super(message);
  }
}

// ---- date helpers (everything in UTC to dodge timezone drift) ----
function dayUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
// A Date -> "YYYY-MM-DD" key (stable, timezone-independent).
export function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}
function monthRange(year: number, month: number) {
  // month is 1..12
  return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) };
}
// Inclusive list of "YYYY-MM-DD" keys from start..end (capped for safety).
function enumerateDates(startStr: string, endStr: string): string[] {
  const out: string[] = [];
  let cur = dayUTC(startStr).getTime();
  const end = dayUTC(endStr).getTime();
  let guard = 0;
  while (cur <= end && guard < 400) {
    out.push(new Date(cur).toISOString().slice(0, 10));
    cur += 24 * 60 * 60 * 1000;
    guard++;
  }
  return out;
}

// Tally a set of records into counts.
function countStatuses(records: { status: string }[]): AttendanceCounts {
  const c: AttendanceCounts = { present: 0, absent: 0, late: 0, halfDay: 0, total: records.length };
  for (const r of records) {
    if (r.status === "PRESENT") c.present++;
    else if (r.status === "ABSENT") c.absent++;
    else if (r.status === "LATE") c.late++;
    else if (r.status === "HALF_DAY") c.halfDay++;
  }
  return c;
}

// ----------------------------------------------------------------------------
// DAILY: the roster for marking, pre-filled with any existing records.
// BATCH QUERIES: we load ALL students in one findMany and ALL existing records
// for the day in one findMany — never one query per student (that "N+1" pattern
// would be 30–50 round-trips). Two queries total, regardless of class size.
// ----------------------------------------------------------------------------
export type DailyStudent = {
  id: string;
  name: string;
  admissionNumber: string;
  photo: string | null;
  status: AttendanceStatus;
  note: string;
};

export async function getDailyAttendance(
  schoolId: string,
  classId: string,
  sectionId: string,
  dateStr: string
): Promise<{ students: DailyStudent[]; exists: boolean }> {
  const day = dayUTC(dateStr);

  const students = await prisma.student.findMany({
    where: { schoolId, classId, sectionId },
    select: { id: true, name: true, admissionNumber: true, photo: true },
    orderBy: { admissionNumber: "asc" },
  });

  const existing = await prisma.attendance.findMany({
    where: { studentId: { in: students.map((s) => s.id) }, date: day },
    select: { studentId: true, status: true, note: true },
  });
  const byStudent = new Map(existing.map((e) => [e.studentId, e]));

  return {
    // Default everyone to PRESENT (most students attend) unless a record exists.
    students: students.map((s) => {
      const rec = byStudent.get(s.id);
      return {
        ...s,
        status: (rec?.status as AttendanceStatus) ?? "PRESENT",
        note: rec?.note ?? "",
      };
    }),
    exists: existing.length > 0,
  };
}

// ----------------------------------------------------------------------------
// MARK: upsert every record inside ONE transaction.
// ----------------------------------------------------------------------------
export type MarkRecord = { studentId: string; status: AttendanceStatus; note?: string };

export async function markAttendance(params: {
  schoolId: string;
  markedById: string;
  classId: string;
  sectionId: string;
  dateStr: string;
  records: MarkRecord[];
}): Promise<{ count: number }> {
  const day = dayUTC(params.dateStr);
  const ids = params.records.map((r) => r.studentId);

  // Interactive transaction: the validation read AND all upserts are one atomic
  // unit. If anything throws, the whole thing rolls back — no half-marked class.
  return prisma.$transaction(async (tx) => {
    // VALIDATE: every studentId must actually belong to this class+section+school.
    const valid = await tx.student.findMany({
      where: { schoolId: params.schoolId, classId: params.classId, sectionId: params.sectionId, id: { in: ids } },
      select: { id: true },
    });
    if (valid.length !== ids.length) {
      throw new AttendanceError("INVALID_STUDENTS", "Some students do not belong to this class/section.");
    }

    // UPSERT each record. upsert = "insert, or update if it already exists." The
    // match key is the unique (studentId, date) pair → Prisma exposes it as
    // `studentId_date`. So re-submitting the same day UPDATES instead of
    // duplicating (see the walkthrough on how this prevents duplicates).
    for (const r of params.records) {
      await tx.attendance.upsert({
        where: { studentId_date: { studentId: r.studentId, date: day } },
        create: {
          studentId: r.studentId,
          date: day,
          status: r.status,
          note: r.note || null,
          markedById: params.markedById,
        },
        update: { status: r.status, note: r.note || null, markedById: params.markedById },
      });
    }

    return { count: params.records.length };
  });
}

// ----------------------------------------------------------------------------
// REPORT: student-wise grid for a date range. ONE query pulls every attendance
// row in the range; we build an in-memory map for O(1) cell lookups instead of
// querying per (student, date) — that's how 30×30 = 900 cells stay fast.
// ----------------------------------------------------------------------------
export type ReportRow = {
  id: string;
  name: string;
  admissionNumber: string;
  statuses: Record<string, AttendanceStatus>; // dateKey -> status
  counts: AttendanceCounts;
  percentage: number;
};

export async function getAttendanceReport(params: {
  schoolId: string;
  classId?: string;
  sectionId?: string;
  startStr: string;
  endStr: string;
}): Promise<{ dateKeys: string[]; rows: ReportRow[] }> {
  const dateKeys = enumerateDates(params.startStr, params.endStr);

  const students = await prisma.student.findMany({
    where: {
      schoolId: params.schoolId,
      ...(params.classId ? { classId: params.classId } : {}),
      ...(params.sectionId ? { sectionId: params.sectionId } : {}),
    },
    select: { id: true, name: true, admissionNumber: true },
    orderBy: { admissionNumber: "asc" },
  });

  const start = dayUTC(params.startStr);
  const end = new Date(dayUTC(params.endStr).getTime() + 24 * 60 * 60 * 1000); // inclusive end
  // ONE batched query for all records in the window for these students.
  const records = await prisma.attendance.findMany({
    where: { studentId: { in: students.map((s) => s.id) }, date: { gte: start, lt: end } },
    select: { studentId: true, date: true, status: true },
  });

  // Group records per student (one pass).
  const byStudent = new Map<string, { dateKey: string; status: AttendanceStatus }[]>();
  for (const r of records) {
    const arr = byStudent.get(r.studentId) ?? [];
    arr.push({ dateKey: dateKey(r.date), status: r.status as AttendanceStatus });
    byStudent.set(r.studentId, arr);
  }

  const rows: ReportRow[] = students.map((s) => {
    const recs = byStudent.get(s.id) ?? [];
    const statuses: Record<string, AttendanceStatus> = {};
    for (const rec of recs) statuses[rec.dateKey] = rec.status;
    const counts = countStatuses(recs);
    return { id: s.id, name: s.name, admissionNumber: s.admissionNumber, statuses, counts, percentage: attendancePercent(counts) };
  });

  return { dateKeys, rows };
}

// CSV text for the report (Admission, Name, each date, then the tallies).
export function buildReportCsv(report: { dateKeys: string[]; rows: ReportRow[] }): string {
  const header = ["Admission No", "Name", ...report.dateKeys, "Present", "Absent", "Late", "Half Day", "Percentage"];
  const lines = [header.join(",")];
  for (const row of report.rows) {
    const cells = report.dateKeys.map((d) => row.statuses[d] ?? "");
    lines.push(
      [
        row.admissionNumber,
        `"${row.name.replace(/"/g, '""')}"`, // quote name in case of commas
        ...cells,
        row.counts.present,
        row.counts.absent,
        row.counts.late,
        row.counts.halfDay,
        `${row.percentage}%`,
      ].join(",")
    );
  }
  return lines.join("\n");
}

// ----------------------------------------------------------------------------
// ONE STUDENT: a month of attendance + stats + per-day list (for the calendar).
// ----------------------------------------------------------------------------
export type StudentAttendance = {
  student: { id: string; name: string; admissionNumber: string; photo: string | null; className: string | null; sectionName: string | null };
  year: number;
  month: number; // 1..12
  daysInMonth: number;
  days: { dateKey: string; status: AttendanceStatus; note: string | null }[];
  counts: AttendanceCounts;
  percentage: number;
};

export async function getStudentAttendance(
  studentId: string,
  schoolId: string,
  year: number,
  month: number,
  whereExtra: Record<string, unknown> = {}
): Promise<StudentAttendance | null> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId, ...whereExtra },
    select: {
      id: true, name: true, admissionNumber: true, photo: true,
      class: { select: { name: true } },
      section: { select: { name: true } },
    },
  });
  if (!student) return null;

  const { start, end } = monthRange(year, month);
  const records = await prisma.attendance.findMany({
    where: { studentId, date: { gte: start, lt: end } },
    select: { date: true, status: true, note: true },
    orderBy: { date: "asc" },
  });

  const days = records.map((r) => ({
    dateKey: dateKey(r.date),
    status: r.status as AttendanceStatus,
    note: r.note,
  }));
  const counts = countStatuses(records);

  return {
    student: {
      id: student.id,
      name: student.name,
      admissionNumber: student.admissionNumber,
      photo: student.photo,
      className: student.class?.name ?? null,
      sectionName: student.section?.name ?? null,
    },
    year,
    month,
    daysInMonth: new Date(Date.UTC(year, month, 0)).getUTCDate(),
    days,
    counts,
    percentage: attendancePercent(counts),
  };
}

// ----------------------------------------------------------------------------
// PARENT: monthly summary per child (ownership via parentId).
// ----------------------------------------------------------------------------
export type ChildAttendanceSummary = {
  id: string;
  name: string;
  className: string | null;
  sectionName: string | null;
  counts: AttendanceCounts;
  percentage: number;
};

export async function getChildrenAttendance(
  parentId: string,
  schoolId: string,
  year: number,
  month: number
): Promise<ChildAttendanceSummary[]> {
  const children = await prisma.student.findMany({
    where: { parentId, schoolId },
    select: { id: true, name: true, class: { select: { name: true } }, section: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  const { start, end } = monthRange(year, month);
  // ONE query for all children's records this month, grouped in memory.
  const records = await prisma.attendance.findMany({
    where: { studentId: { in: children.map((c) => c.id) }, date: { gte: start, lt: end } },
    select: { studentId: true, status: true },
  });
  const byChild = new Map<string, { status: string }[]>();
  for (const r of records) {
    const arr = byChild.get(r.studentId) ?? [];
    arr.push({ status: r.status });
    byChild.set(r.studentId, arr);
  }

  return children.map((c) => {
    const counts = countStatuses(byChild.get(c.id) ?? []);
    return {
      id: c.id,
      name: c.name,
      className: c.class?.name ?? null,
      sectionName: c.section?.name ?? null,
      counts,
      percentage: attendancePercent(counts),
    };
  });
}

// PARENT: one child's month detail, only if the child belongs to this parent.
export async function getChildAttendanceDetail(
  studentId: string,
  parentId: string,
  schoolId: string,
  year: number,
  month: number
) {
  return getStudentAttendance(studentId, schoolId, year, month, { parentId });
}
