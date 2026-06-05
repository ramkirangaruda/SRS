// Progress (term) report data layer.
//
// THE AGGREGATION (Step 3): for a class+section we pull every TestReport for its
// students and every Attendance row, then combine:
//   • per student → group tests by subject → subject term-average + grade
//   • per student → attendance counts → attendance %
//   • per student → overall % (mean of subject averages) → overall grade
//   • across the class → competition RANK on overall %
// We FREEZE this into ProgressReport.data (a JSON snapshot) at generation time so
// a parent viewing it later doesn't re-run this heavy class-wide aggregation, and
// so the report is a true point-in-time document. generatedAt lets us detect
// staleness if a TestReport changes afterward.
import { prisma } from "@/lib/prisma";
import { gradeFor, competitionRanks } from "@/lib/grades";

export type SubjectReport = { subjectName: string; tests: { testName: string; obtained: number; total: number }[]; average: number; grade: string };
export type StudentReport = {
  studentId: string; studentName: string; admissionNumber: string; dob: string | null;
  subjects: SubjectReport[]; attendancePercent: number; overallPercent: number; overallGrade: string; rank: number;
};

// Build per-student report data (sans rank) from that student's test rows.
function buildSubjects(testRows: { subjectName: string; testName: string; obtainedMarks: number; totalMarks: number; percentage: number }[]): { subjects: SubjectReport[]; overall: number } {
  const bySubject = new Map<string, typeof testRows>();
  for (const r of testRows) { const a = bySubject.get(r.subjectName) ?? []; a.push(r); bySubject.set(r.subjectName, a); }
  const subjects: SubjectReport[] = Array.from(bySubject.entries()).map(([subjectName, arr]) => {
    const average = Math.round((arr.reduce((p, q) => p + q.percentage, 0) / arr.length) * 10) / 10;
    return { subjectName, tests: arr.map((t) => ({ testName: t.testName, obtained: t.obtainedMarks, total: t.totalMarks })), average, grade: gradeFor(average) };
  });
  const overall = subjects.length ? Math.round((subjects.reduce((p, q) => p + q.average, 0) / subjects.length) * 10) / 10 : 0;
  return { subjects, overall };
}

// Core: compute the report rows for a class/section (used by preview AND generate).
async function computeClassReports(schoolId: string, classId: string, sectionId: string): Promise<StudentReport[]> {
  const students = await prisma.student.findMany({ where: { schoolId, classId, sectionId }, select: { id: true, name: true, admissionNumber: true, dateOfBirth: true }, orderBy: { name: "asc" } });
  const ids = students.map((s) => s.id);

  // ONE query for all test rows of the class (selecting only needed columns).
  const tests = await prisma.testReport.findMany({ where: { studentId: { in: ids } }, select: { studentId: true, obtainedMarks: true, totalMarks: true, percentage: true, subject: { select: { name: true } }, testName: true } });
  const testsByStudent = new Map<string, { subjectName: string; testName: string; obtainedMarks: number; totalMarks: number; percentage: number }[]>();
  for (const t of tests) { const a = testsByStudent.get(t.studentId) ?? []; a.push({ subjectName: t.subject?.name ?? "—", testName: t.testName, obtainedMarks: t.obtainedMarks, totalMarks: t.totalMarks, percentage: t.percentage ?? (t.totalMarks ? (t.obtainedMarks / t.totalMarks) * 100 : 0) }); testsByStudent.set(t.studentId, a); }

  // ONE grouped query for attendance counts per student per status.
  const att = await prisma.attendance.groupBy({ by: ["studentId", "status"], where: { studentId: { in: ids } }, _count: { _all: true } });
  const attByStudent = new Map<string, Record<string, number>>();
  for (const a of att) { const m = attByStudent.get(a.studentId) ?? {}; m[a.status] = a._count._all; attByStudent.set(a.studentId, m); }
  function attPct(id: string) {
    const m = attByStudent.get(id) ?? {};
    const total = (m.PRESENT ?? 0) + (m.ABSENT ?? 0) + (m.LATE ?? 0) + (m.HALF_DAY ?? 0);
    if (total === 0) return 0;
    return Math.round((((m.PRESENT ?? 0) + (m.LATE ?? 0) + 0.5 * (m.HALF_DAY ?? 0)) / total) * 100);
  }

  const base = students.map((s) => {
    const { subjects, overall } = buildSubjects(testsByStudent.get(s.id) ?? []);
    return { studentId: s.id, studentName: s.name, admissionNumber: s.admissionNumber, dob: s.dateOfBirth?.toISOString() ?? null, subjects, attendancePercent: attPct(s.id), overallPercent: overall, overallGrade: gradeFor(overall) };
  });
  // Rank the class by overall %, ties shared (competition rank).
  const ranked = competitionRanks(base.slice().sort((a, b) => b.overallPercent - a.overallPercent), (x) => x.overallPercent);
  const rankById = new Map(ranked.map((r) => [r.studentId, r.rank]));
  return base.map((b) => ({ ...b, rank: rankById.get(b.studentId) ?? 0 }));
}

export async function generatePreview(schoolId: string, classId: string, sectionId: string) {
  return computeClassReports(schoolId, classId, sectionId);
}

// Persist a ProgressReport per student (status DRAFT) with the snapshot + remarks.
export async function generateReports(params: {
  schoolId: string; classId: string; sectionId: string; academicYearId: string; term: string;
  perStudent: Record<string, { remarks?: string; coCurricular?: string; conduct?: string }>;
}) {
  const reports = await computeClassReports(params.schoolId, params.classId, params.sectionId);
  const now = new Date();
  await prisma.$transaction(
    reports.map((r) => {
      const extra = params.perStudent[r.studentId] ?? {};
      const data = JSON.stringify({ ...r, term: params.term });
      return prisma.progressReport.upsert({
        where: { studentId_academicYearId_term: { studentId: r.studentId, academicYearId: params.academicYearId, term: params.term } },
        create: { studentId: r.studentId, academicYearId: params.academicYearId, term: params.term, classId: params.classId, sectionId: params.sectionId, overallPercent: r.overallPercent, overallGrade: r.overallGrade, attendancePercent: r.attendancePercent, rank: r.rank, data, remarks: extra.remarks || null, coCurricular: extra.coCurricular || null, conduct: extra.conduct || null, status: "DRAFT", generatedAt: now, schoolId: params.schoolId },
        update: { classId: params.classId, sectionId: params.sectionId, overallPercent: r.overallPercent, overallGrade: r.overallGrade, attendancePercent: r.attendancePercent, rank: r.rank, data, remarks: extra.remarks ?? undefined, coCurricular: extra.coCurricular ?? undefined, conduct: extra.conduct ?? undefined, generatedAt: now },
      });
    })
  );
  return { count: reports.length };
}

export async function listReports(schoolId: string, opts: { classId?: string; term?: string; academicYearId?: string; status?: string } = {}) {
  const clean = (v?: string) => (v && v.trim() !== "" ? v : undefined);
  const rows = await prisma.progressReport.findMany({
    where: { schoolId, ...(clean(opts.classId) ? { classId: opts.classId } : {}), ...(clean(opts.term) ? { term: opts.term } : {}), ...(clean(opts.academicYearId) ? { academicYearId: opts.academicYearId } : {}), ...(clean(opts.status) ? { status: opts.status } : {}) },
    include: { student: { select: { id: true, name: true, admissionNumber: true } }, class: { select: { name: true } } },
    orderBy: [{ term: "asc" }, { rank: "asc" }],
  });
  // Staleness in ONE extra query: latest TestReport.updatedAt per student, then
  // compare each report's generatedAt against it (instead of N per-row queries).
  const studentIds = Array.from(new Set(rows.map((r) => r.student.id)));
  const latest = await prisma.testReport.groupBy({ by: ["studentId"], where: { studentId: { in: studentIds } }, _max: { updatedAt: true } });
  const latestBy = new Map(latest.map((l) => [l.studentId, l._max.updatedAt]));
  return rows.map((r) => {
    const lt = latestBy.get(r.student.id);
    const stale = !!(r.generatedAt && lt && lt > r.generatedAt);
    return { id: r.id, studentName: r.student.name, admissionNumber: r.student.admissionNumber, className: r.class?.name ?? null, term: r.term, overallGrade: r.overallGrade, rank: r.rank, status: r.status, generatedAt: r.generatedAt?.toISOString() ?? null, stale };
  });
}

// STALENESS: a report is stale if any of the student's TestReports was updated
// AFTER the report was generated.
async function isStale(studentId: string, generatedAt: Date | null): Promise<boolean> {
  if (!generatedAt) return false;
  const latest = await prisma.testReport.aggregate({ where: { studentId }, _max: { updatedAt: true } });
  return !!latest._max.updatedAt && latest._max.updatedAt > generatedAt;
}

export async function getReport(id: string, schoolId: string, whereExtra: Record<string, unknown> = {}) {
  const r = await prisma.progressReport.findFirst({
    where: { id, schoolId, ...whereExtra },
    include: { student: { select: { name: true, admissionNumber: true, class: { select: { name: true } }, section: { select: { name: true } } } }, school: { select: { name: true, logo: true, address: true, showRankToParents: true } }, academicYear: { select: { name: true } } },
  });
  if (!r) return null;
  const snapshot = r.data ? JSON.parse(r.data) : null;
  return {
    id: r.id, term: r.term, status: r.status, overallGrade: r.overallGrade, overallPercent: r.overallPercent, attendancePercent: r.attendancePercent,
    rank: r.rank, remarks: r.remarks, coCurricular: r.coCurricular, conduct: r.conduct,
    generatedAt: r.generatedAt?.toISOString() ?? null, publishedAt: r.publishedAt?.toISOString() ?? null,
    student: { name: r.student.name, admissionNumber: r.student.admissionNumber, className: r.student.class?.name ?? null, sectionName: r.student.section?.name ?? null },
    school: { name: r.school.name, logo: r.school.logo, address: r.school.address, showRankToParents: r.school.showRankToParents },
    academicYearName: r.academicYear.name,
    snapshot,
    stale: await isStale(r.studentId, r.generatedAt),
  };
}

export async function publishReports(ids: string[], schoolId: string) {
  const r = await prisma.progressReport.updateMany({ where: { id: { in: ids }, schoolId }, data: { status: "PUBLISHED", publishedAt: new Date() } });
  return r.count;
}

// Re-pull data for one report and refresh its snapshot (after marks were fixed).
export async function regenerate(id: string, schoolId: string) {
  const report = await prisma.progressReport.findFirst({ where: { id, schoolId }, select: { id: true, classId: true, sectionId: true, studentId: true, academicYearId: true, term: true } });
  if (!report || !report.classId || !report.sectionId) return false;
  const reports = await computeClassReports(schoolId, report.classId, report.sectionId);
  const mine = reports.find((x) => x.studentId === report.studentId);
  if (!mine) return false;
  await prisma.progressReport.update({ where: { id: report.id }, data: { overallPercent: mine.overallPercent, overallGrade: mine.overallGrade, attendancePercent: mine.attendancePercent, rank: mine.rank, data: JSON.stringify({ ...mine, term: report.term }), generatedAt: new Date() } });
  return true;
}

// PARENT: only PUBLISHED reports for their children.
export async function parentReports(parentId: string, schoolId: string) {
  const rows = await prisma.progressReport.findMany({
    where: { schoolId, status: "PUBLISHED", student: { parentId } },
    include: { student: { select: { name: true, class: { select: { name: true } } } } },
    orderBy: { term: "asc" },
  });
  return rows.map((r) => ({ id: r.id, studentName: r.student.name, className: r.student.class?.name ?? null, term: r.term, overallGrade: r.overallGrade, rank: r.rank }));
}
