// Test reports data layer: bulk entry, results with rank, class stats, a single
// student's scores, and test-vs-test comparison.
import { prisma } from "@/lib/prisma";
import { gradeFor, competitionRanks, PASS_PERCENT, GRADE_ORDER } from "@/lib/grades";

const clean = (v?: string) => (v && v.trim() !== "" ? v : undefined);
function dayUTC(s: string) { const [y, m, d] = s.split("-").map(Number); return new Date(Date.UTC(y, m - 1, d)); }
function pctOf(obtained: number, total: number) { return total > 0 ? (obtained / total) * 100 : 0; }

// BULK UPSERT: one transaction; percentage + grade computed and STORED per row
// (so View Mode can sort/average without recomputing). Upsert keys on the unique
// (studentId, subjectId, testName, date) so re-entering edits instead of dupes.
export async function bulkUpsertTestReports(params: {
  schoolId: string; classId: string; sectionId: string; subjectId: string; testName: string; date: string; totalMarks: number;
  records: { studentId: string; obtainedMarks: number; remarks?: string }[];
}) {
  const date = dayUTC(params.date);
  await prisma.$transaction(
    params.records.map((r) => {
      const percentage = pctOf(r.obtainedMarks, params.totalMarks);
      const data = { totalMarks: params.totalMarks, obtainedMarks: r.obtainedMarks, percentage, grade: gradeFor(percentage), remarks: r.remarks || null, classId: params.classId, sectionId: params.sectionId };
      return prisma.testReport.upsert({
        where: { studentId_subjectId_testName_date: { studentId: r.studentId, subjectId: params.subjectId, testName: params.testName, date } },
        create: { ...data, studentId: r.studentId, subjectId: params.subjectId, testName: params.testName, date, schoolId: params.schoolId },
        update: data,
      });
    })
  );
  return { count: params.records.length };
}

// Existing marks for a test (to preload Entry Mode for editing).
export async function getTestEntries(schoolId: string, classId: string, sectionId: string, subjectId: string, testName: string, date: string) {
  return prisma.testReport.findMany({ where: { schoolId, classId, sectionId, subjectId, testName, date: dayUTC(date) }, select: { studentId: true, obtainedMarks: true, totalMarks: true, remarks: true } });
}

export type ResultRow = { id: string; studentId: string; studentName: string; admissionNumber: string; obtainedMarks: number; totalMarks: number; percentage: number; grade: string; rank: number };

// Results for ONE test (class+section+subject+testName), with competition rank.
export async function listResults(params: { schoolId: string; classId?: string; sectionId?: string; subjectId?: string; testName?: string; startDate?: string; endDate?: string }) {
  const rows = await prisma.testReport.findMany({
    where: {
      schoolId: params.schoolId,
      ...(clean(params.classId) ? { classId: params.classId } : {}),
      ...(clean(params.sectionId) ? { sectionId: params.sectionId } : {}),
      ...(clean(params.subjectId) ? { subjectId: params.subjectId } : {}),
      ...(clean(params.testName) ? { testName: params.testName } : {}),
      ...(clean(params.startDate) || clean(params.endDate) ? { date: { ...(clean(params.startDate) ? { gte: dayUTC(params.startDate!) } : {}), ...(clean(params.endDate) ? { lte: dayUTC(params.endDate!) } : {}) } } : {}),
    },
    include: { student: { select: { name: true, admissionNumber: true } } },
    orderBy: { obtainedMarks: "desc" },
  });
  const base = rows.map((r) => {
    const percentage = r.percentage ?? pctOf(r.obtainedMarks, r.totalMarks);
    return { id: r.id, studentId: r.studentId, studentName: r.student.name, admissionNumber: r.student.admissionNumber, obtainedMarks: r.obtainedMarks, totalMarks: r.totalMarks, percentage, grade: r.grade ?? gradeFor(percentage) };
  });
  return competitionRanks(base, (x) => x.percentage) as ResultRow[];
}

// Class statistics for a test: highest/lowest/average, pass %, grade distribution.
export async function getStats(params: { schoolId: string; classId?: string; sectionId?: string; subjectId?: string; testName?: string }) {
  const rows = await listResults(params);
  if (rows.length === 0) return { count: 0, highest: 0, lowest: 0, average: 0, passPercent: 0, distribution: GRADE_ORDER.map((g) => ({ grade: g, count: 0 })) };
  const pcts = rows.map((r) => r.percentage);
  const dist = new Map<string, number>(GRADE_ORDER.map((g) => [g, 0]));
  for (const r of rows) dist.set(r.grade, (dist.get(r.grade) ?? 0) + 1);
  return {
    count: rows.length,
    highest: Math.max(...rows.map((r) => r.obtainedMarks)),
    lowest: Math.min(...rows.map((r) => r.obtainedMarks)),
    average: Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 10) / 10,
    passPercent: Math.round((rows.filter((r) => r.percentage >= PASS_PERCENT).length / rows.length) * 100),
    distribution: GRADE_ORDER.map((g) => ({ grade: g, count: dist.get(g) ?? 0 })),
  };
}

// All of one student's scores across subjects, chronological.
export async function getStudentScores(studentId: string, schoolId: string) {
  const rows = await prisma.testReport.findMany({ where: { studentId, schoolId }, include: { subject: { select: { name: true } } }, orderBy: { date: "asc" } });
  return rows.map((r) => {
    const percentage = r.percentage ?? pctOf(r.obtainedMarks, r.totalMarks);
    return { id: r.id, subjectName: r.subject?.name ?? "—", subjectId: r.subjectId, testName: r.testName, date: r.date.toISOString(), obtainedMarks: r.obtainedMarks, totalMarks: r.totalMarks, percentage, grade: r.grade ?? gradeFor(percentage) };
  });
}

// Per-subject series for the trend line chart: { subject -> [{testName, percentage}] }.
export async function getStudentChart(studentId: string, schoolId: string) {
  const scores = await getStudentScores(studentId, schoolId);
  const bySubject = new Map<string, { testName: string; date: string; percentage: number }[]>();
  for (const s of scores) {
    const arr = bySubject.get(s.subjectName) ?? [];
    arr.push({ testName: s.testName, date: s.date, percentage: Math.round(s.percentage) });
    bySubject.set(s.subjectName, arr);
  }
  return Array.from(bySubject.entries()).map(([subject, points]) => ({ subject, points }));
}

// COMPARE two tests for the same class/subject. We run TWO filtered queries on
// the same TestReport table and JOIN them in memory on studentId.
export async function compareTests(params: { schoolId: string; classId: string; subjectId: string; testName1: string; testName2: string }) {
  const [a, b] = await Promise.all([
    listResults({ schoolId: params.schoolId, classId: params.classId, subjectId: params.subjectId, testName: params.testName1 }),
    listResults({ schoolId: params.schoolId, classId: params.classId, subjectId: params.subjectId, testName: params.testName2 }),
  ]);
  const bByStudent = new Map(b.map((r) => [r.studentId, r]));
  const rows = a.map((r1) => {
    const r2 = bByStudent.get(r1.studentId);
    const m1 = r1.obtainedMarks;
    const m2 = r2?.obtainedMarks ?? null;
    return { studentId: r1.studentId, studentName: r1.studentName, marks1: m1, marks2: m2, improvement: m2 !== null ? m2 - m1 : null };
  });
  const avg = (xs: number[]) => (xs.length ? xs.reduce((p, q) => p + q, 0) / xs.length : 0);
  const avg1 = avg(a.map((x) => x.percentage));
  const avg2 = avg(b.map((x) => x.percentage));
  return { rows, avg1: Math.round(avg1 * 10) / 10, avg2: Math.round(avg2 * 10) / 10, classDelta: Math.round((avg2 - avg1) * 10) / 10 };
}

export async function deleteTest(params: { schoolId: string; classId: string; sectionId: string; subjectId: string; testName: string; date: string }) {
  const r = await prisma.testReport.deleteMany({ where: { schoolId: params.schoolId, classId: params.classId, sectionId: params.sectionId, subjectId: params.subjectId, testName: params.testName, date: dayUTC(params.date) } });
  return r.count;
}

// PARENT: subject-wise latest score + trend vs the previous test, per child.
export async function getParentScores(parentId: string, schoolId: string) {
  const children = await prisma.student.findMany({ where: { parentId, schoolId }, select: { id: true, name: true, class: { select: { name: true } } }, orderBy: { name: "asc" } });
  const result = [];
  for (const child of children) {
    const scores = await getStudentScores(child.id, schoolId);
    // group by subject, keep last two by date
    const bySubject = new Map<string, typeof scores>();
    for (const s of scores) { const a = bySubject.get(s.subjectName) ?? []; a.push(s); bySubject.set(s.subjectName, a); }
    const subjects = Array.from(bySubject.entries()).map(([subjectName, arr]) => {
      const sorted = arr.sort((x, y) => x.date.localeCompare(y.date));
      const latest = sorted[sorted.length - 1];
      const prev = sorted.length > 1 ? sorted[sorted.length - 2] : null;
      const trend = prev ? Math.round((latest.percentage - prev.percentage) * 10) / 10 : null;
      return { subjectName, testName: latest.testName, obtainedMarks: latest.obtainedMarks, totalMarks: latest.totalMarks, percentage: Math.round(latest.percentage), grade: latest.grade, trend };
    });
    result.push({ studentId: child.id, studentName: child.name, className: child.class?.name ?? null, subjects });
  }
  return result;
}
