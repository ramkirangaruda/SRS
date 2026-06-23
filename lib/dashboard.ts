// Dashboard data layer. Each dashboard is ONE endpoint that fans out many queries
// with Promise.all.
//
// WHY ONE ENDPOINT + Promise.all: the dashboard needs ~12 different counts from
// ~12 tables. Two ways to get them:
//   • 12 separate API calls from the browser — 12 round-trips, 12 auth checks,
//     and the browser caps concurrent requests, so they queue. Slow.
//   • ONE endpoint that runs all 12 queries with Promise.all — the queries fire
//     together and the DB works on them concurrently; total time ≈ the SLOWEST
//     query, not the SUM. One round-trip, one auth check. This is what we do.
// (await-ing each query in sequence would be sum-of-all-times — the anti-pattern.)
import { prisma } from "@/lib/prisma";
import { getFeeSummary } from "@/lib/fees";
import { todayMenu } from "@/lib/meals";
import { listUpcoming } from "@/lib/events";
import { followUpsToday } from "@/lib/enquiry";
import { daycareToday } from "@/lib/daycare";
import { todayCounts as visitorTodayCounts } from "@/lib/visitors";
import { recentActivity } from "@/lib/activity";

const dayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const dayEnd = () => { const d = new Date(); d.setHours(23, 59, 59, 999); return d; };
const monthStart = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1); };

// Today's attendance %, computed from one groupBy.
async function todayAttendancePct(schoolId: string) {
  const rows = await prisma.attendance.groupBy({ by: ["status"], where: { student: { schoolId }, date: { gte: dayStart(), lte: dayEnd() } }, _count: { _all: true } });
  const by: Record<string, number> = {};
  for (const r of rows) by[r.status] = r._count._all;
  const total = (by.PRESENT ?? 0) + (by.ABSENT ?? 0) + (by.LATE ?? 0) + (by.HALF_DAY ?? 0);
  const pct = total ? Math.round((((by.PRESENT ?? 0) + (by.LATE ?? 0) + 0.5 * (by.HALF_DAY ?? 0)) / total) * 100) : null;
  return { pct, marked: total };
}

// Students whose THIS-MONTH attendance is below 75% (bottom 5).
async function lowAttendance(schoolId: string) {
  const rows = await prisma.attendance.groupBy({ by: ["studentId", "status"], where: { student: { schoolId }, date: { gte: monthStart() } }, _count: { _all: true } });
  const per = new Map<string, Record<string, number>>();
  for (const r of rows) { const m = per.get(r.studentId) ?? {}; m[r.status] = r._count._all; per.set(r.studentId, m); }
  const scored: { studentId: string; pct: number }[] = [];
  for (const [studentId, m] of per) {
    const total = (m.PRESENT ?? 0) + (m.ABSENT ?? 0) + (m.LATE ?? 0) + (m.HALF_DAY ?? 0);
    if (total < 3) continue; // ignore tiny samples
    const pct = Math.round((((m.PRESENT ?? 0) + (m.LATE ?? 0) + 0.5 * (m.HALF_DAY ?? 0)) / total) * 100);
    if (pct < 75) scored.push({ studentId, pct });
  }
  scored.sort((a, b) => a.pct - b.pct);
  const top = scored.slice(0, 5);
  const students = await prisma.student.findMany({ where: { id: { in: top.map((t) => t.studentId) } }, select: { id: true, name: true, class: { select: { name: true } } } });
  const nameById = new Map(students.map((s) => [s.id, s]));
  return top.map((t) => ({ studentId: t.studentId, name: nameById.get(t.studentId)?.name ?? "—", className: nameById.get(t.studentId)?.class?.name ?? null, pct: t.pct }));
}

// Fee defaulters: students whose total paid < their class fee for the active year.
async function feeDefaulters(schoolId: string) {
  const year = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true } });
  if (!year) return [];
  const [structures, students, paid] = await Promise.all([
    prisma.feeStructure.findMany({ where: { schoolId, academicYearId: year.id }, select: { classId: true, totalAmount: true } }),
    prisma.student.findMany({ where: { schoolId }, select: { id: true, name: true, classId: true, class: { select: { name: true } } } }),
    prisma.feePayment.groupBy({ by: ["studentId"], where: { schoolId }, _sum: { amount: true } }),
  ]);
  const feeByClass = new Map(structures.map((s) => [s.classId, s.totalAmount]));
  const paidBy = new Map(paid.map((p) => [p.studentId, p._sum.amount ?? 0]));
  const defaulters = students
    .map((s) => ({ name: s.name, className: s.class?.name ?? null, pending: (feeByClass.get(s.classId) ?? 0) - (paidBy.get(s.id) ?? 0) }))
    .filter((s) => s.pending > 0)
    .sort((a, b) => b.pending - a.pending)
    .slice(0, 5);
  return defaulters;
}

// BIRTHDAYS today. We use Postgres EXTRACT to push the month/day filter into the
// DB — only matching rows come back, not all non-null DOBs. On a large school with
// 2,000 students this is the difference between transferring ~2,000 rows vs ~5.
async function birthdaysToday(schoolId: string) {
  const now = new Date();
  // EXTRACT(MONTH) is 1-indexed; JS getMonth() is 0-indexed.
  const month = now.getMonth() + 1;
  const day = now.getDate();

  type StudentRow = { name: string; class_name: string | null };
  type StaffRow = { name: string };

  const [students, staff] = await Promise.all([
    prisma.$queryRaw<StudentRow[]>`
      SELECT s.name, c.name AS class_name
      FROM "Student" s
      LEFT JOIN "Class" c ON c.id = s."classId"
      WHERE s."schoolId" = ${schoolId}
        AND s."dateOfBirth" IS NOT NULL
        AND EXTRACT(MONTH FROM s."dateOfBirth") = ${month}
        AND EXTRACT(DAY   FROM s."dateOfBirth") = ${day}
    `,
    prisma.$queryRaw<StaffRow[]>`
      SELECT u.name
      FROM "StaffMember" sm
      JOIN "User" u ON u.id = sm."userId"
      WHERE sm."schoolId" = ${schoolId}
        AND sm."dateOfBirth" IS NOT NULL
        AND EXTRACT(MONTH FROM sm."dateOfBirth") = ${month}
        AND EXTRACT(DAY   FROM sm."dateOfBirth") = ${day}
    `,
  ]);

  return [
    ...students.map((s) => ({ name: s.name, detail: s.class_name ?? "Student", kind: "student" as const })),
    ...staff.map((s) => ({ name: s.name, detail: "Staff", kind: "staff" as const })),
  ];
}

export async function principalDashboard(schoolId: string) {
  const lastMonthStart = new Date(); lastMonthStart.setMonth(lastMonthStart.getMonth() - 1); lastMonthStart.setDate(1); lastMonthStart.setHours(0, 0, 0, 0);
  // Run in three batches of ~5 instead of one 15-wide Promise.all. Firing 15
  // queries at once can exhaust a small DB connection pool — each waits on a
  // connection, and if too many wait past the pool timeout the whole request 500s.
  // Batching keeps the dashboard fast while staying within the pool.
  const [studentCount, studentsAddedThisMonth, attendance, fees, pendingFeedback] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.student.count({ where: { schoolId, createdAt: { gte: monthStart() } } }),
    todayAttendancePct(schoolId),
    getFeeSummary(schoolId),
    prisma.feedback.count({ where: { schoolId, status: { not: "RESOLVED" } } }),
  ]);
  const [visitors, upcoming, followUps, pendingAdmissions, low] = await Promise.all([
    visitorTodayCounts(schoolId),
    listUpcoming(schoolId, 7),
    followUpsToday(schoolId),
    prisma.admissionQuery.findMany({ where: { schoolId, status: "PENDING" }, select: { id: true, studentName: true, classAppliedFor: true, createdAt: true }, orderBy: { createdAt: "asc" }, take: 5 }),
    lowAttendance(schoolId),
  ]);
  const [defaulters, menu, birthdays, daycare, activity] = await Promise.all([
    feeDefaulters(schoolId),
    todayMenu(schoolId, "SCHOOL"),
    birthdaysToday(schoolId),
    daycareToday(schoolId),
    recentActivity(schoolId, 10),
  ]);

  return {
    stats: {
      students: studentCount, studentsAddedThisMonth,
      attendancePct: attendance.pct, attendanceMarked: attendance.marked,
      feeCollected: fees.collected, feeExpected: fees.expected, feePending: fees.pending,
      pendingFeedback, visitorsOnPremises: visitors.onPremises, upcomingEvents: upcoming.length,
    },
    followUps: followUps.slice(0, 5),
    pendingAdmissions: pendingAdmissions.map((a) => ({ id: a.id, studentName: a.studentName, classAppliedFor: a.classAppliedFor, daysPending: Math.floor((Date.now() - a.createdAt.getTime()) / 86400000) })),
    lowAttendance: low,
    feeDefaulters: defaulters,
    menu: menu?.lunch ?? [],
    birthdays,
    daycare,
    upcoming: upcoming.slice(0, 5),
    activity,
  };
}

// ---- PARENT ----
export async function parentDashboard(parentId: string, schoolId: string, studentId?: string) {
  const children = await prisma.student.findMany({
    where: { parentId, schoolId },
    select: { id: true, name: true, photo: true, admissionNumber: true, dateOfBirth: true, classId: true, sectionId: true, isDaycare: true, class: { select: { name: true } }, section: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  if (children.length === 0) return { children: [], selected: null };
  const child = (studentId && children.find((c) => c.id === studentId)) || children[0];

  const now = new Date();
  const [todayAtt, homeworkCount, nextHw, unreadBroadcast, fees, upcoming, classmateBdays] = await Promise.all([
    prisma.attendance.findFirst({ where: { studentId: child.id, date: { gte: dayStart(), lte: dayEnd() } }, select: { status: true, createdAt: true } }),
    prisma.homework.count({ where: { schoolId, status: "ACTIVE", classId: child.classId, OR: [{ sectionId: null }, { sectionId: child.sectionId }] } }),
    prisma.homework.findFirst({ where: { schoolId, status: "ACTIVE", classId: child.classId, OR: [{ sectionId: null }, { sectionId: child.sectionId }] }, orderBy: { dueDate: "asc" }, select: { dueDate: true } }),
    prisma.broadcastRecipient.count({ where: { userId: parentId, readAt: null } }),
    getChildFee(schoolId, child.classId, child.id),
    listUpcoming(schoolId, 30, { classIds: [child.classId] }),
    prisma.student.findMany({ where: { schoolId, classId: child.classId, dateOfBirth: { not: null }, id: { not: child.id } }, select: { name: true, dateOfBirth: true } }),
  ]);

  const isToday = (dob: Date | null) => !!dob && dob.getMonth() === now.getMonth() && dob.getDate() === now.getDate();
  return {
    children: children.map((c) => ({ id: c.id, name: c.name, photo: c.photo, admissionNumber: c.admissionNumber, className: c.class?.name ?? null, sectionName: c.section?.name ?? null })),
    selected: { id: child.id, name: child.name, className: child.class?.name ?? null, sectionName: child.section?.name ?? null, isDaycare: child.isDaycare, isBirthday: isToday(child.dateOfBirth) },
    today: {
      attendance: todayAtt ? { status: todayAtt.status, at: todayAtt.createdAt.toISOString() } : null,
      homeworkCount, nextHomeworkDue: nextHw?.dueDate?.toISOString() ?? null,
      feePending: fees.pending,
    },
    unread: { broadcasts: unreadBroadcast },
    upcoming: upcoming.slice(0, 3),
    classmateBirthdays: classmateBdays.filter((s) => isToday(s.dateOfBirth)).map((s) => s.name),
  };
}

async function getChildFee(schoolId: string, classId: string, studentId: string) {
  const year = await prisma.academicYear.findFirst({ where: { schoolId, isActive: true }, select: { id: true } });
  const structure = year ? await prisma.feeStructure.findFirst({ where: { schoolId, classId, academicYearId: year.id }, select: { totalAmount: true } }) : null;
  const paid = await prisma.feePayment.aggregate({ where: { studentId }, _sum: { amount: true } });
  const pending = (structure?.totalAmount ?? 0) - (paid._sum.amount ?? 0);
  return { pending: Math.max(0, pending) };
}
