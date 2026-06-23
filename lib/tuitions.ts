// Tuitions data layer (Branch 2 module). Batches hold a flat per-student fee; we
// track enrollments and payments (paise) against each. Everything is scoped by
// schoolId so access control is structural. Data is shared across branches — the
// branch only decides whether the module is shown.
import { prisma } from "@/lib/prisma";
import { statusFor, type FeeStatus } from "@/lib/fee-status";

const clean = (v?: string | null) => (v && v.trim() !== "" ? v.trim() : null);

// ---- Batches -------------------------------------------------------------

export type BatchRow = {
  id: string;
  name: string;
  subject: string | null;
  feeAmount: number; // paise, per student
  schedule: string | null;
  isActive: boolean;
  tutorId: string | null;
  tutorName: string | null;
  studentCount: number;
  expected: number; // feeAmount * active students
  collected: number;
  pending: number;
};

// LIST all batches with their student counts and collected totals. Counts come
// from a relation _count; collected totals from ONE grouped payment query.
export async function listBatches(schoolId: string): Promise<BatchRow[]> {
  const batches = await prisma.tuitionBatch.findMany({
    where: { schoolId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    // Only count ACTIVE enrollments so unenrolled students don't inflate expected fees.
    include: { tutor: { select: { name: true } }, _count: { select: { enrollments: { where: { isActive: true } } } } },
  });
  const paid = await prisma.tuitionPayment.groupBy({ by: ["batchId"], where: { schoolId }, _sum: { amount: true } });
  const paidByBatch = new Map(paid.map((p) => [p.batchId, p._sum.amount ?? 0]));

  return batches.map((b) => {
    const studentCount = b._count.enrollments;
    const expected = b.feeAmount * studentCount;
    const collected = paidByBatch.get(b.id) ?? 0;
    return {
      id: b.id, name: b.name, subject: b.subject, feeAmount: b.feeAmount, schedule: b.schedule,
      isActive: b.isActive, tutorId: b.tutorId, tutorName: b.tutor?.name ?? null,
      studentCount, expected, collected, pending: Math.max(0, expected - collected),
    };
  });
}

export type BatchInput = {
  name: string;
  subject?: string | null;
  feeAmount: number; // paise (route converts rupees → paise)
  schedule?: string | null;
  tutorId?: string | null;
  isActive?: boolean;
};

function batchData(input: BatchInput, schoolId: string) {
  return {
    name: input.name.trim(),
    subject: clean(input.subject),
    feeAmount: Math.max(0, Math.round(input.feeAmount)),
    schedule: clean(input.schedule),
    tutorId: clean(input.tutorId),
    isActive: input.isActive ?? true,
    schoolId,
  };
}

export async function createBatch(input: BatchInput, schoolId: string) {
  return prisma.tuitionBatch.create({ data: batchData(input, schoolId) });
}

export async function updateBatch(id: string, input: BatchInput, schoolId: string) {
  const existing = await prisma.tuitionBatch.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!existing) return null;
  const { schoolId: _omit, ...data } = batchData(input, schoolId);
  return prisma.tuitionBatch.update({ where: { id }, data });
}

export async function deleteBatch(id: string, schoolId: string) {
  const existing = await prisma.tuitionBatch.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!existing) return false;
  await prisma.tuitionBatch.delete({ where: { id } }); // cascades enrollments + payments
  return true;
}

// ---- Batch detail (enrollments + payments) -------------------------------

export type BatchStudentRow = {
  enrollmentId: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  className: string | null;
  paid: number;
  balance: number;
  status: FeeStatus;
};

export type BatchPaymentRow = {
  id: string; amount: number; date: string; mode: string; notes: string | null;
  studentName: string; collectedByName: string;
};

export type BatchDetail = {
  batch: BatchRow;
  students: BatchStudentRow[];
  payments: BatchPaymentRow[];
};

export async function getBatchDetail(id: string, schoolId: string): Promise<BatchDetail | null> {
  const b = await prisma.tuitionBatch.findFirst({
    where: { id, schoolId },
    include: { tutor: { select: { name: true } } },
  });
  if (!b) return null;

  const enrollments = await prisma.tuitionEnrollment.findMany({
    where: { batchId: id },
    include: { student: { select: { id: true, name: true, admissionNumber: true, class: { select: { name: true } } } } },
    orderBy: { student: { name: "asc" } },
  });

  // Per-student paid total for THIS batch in one grouped query.
  const grouped = await prisma.tuitionPayment.groupBy({ by: ["studentId"], where: { batchId: id }, _sum: { amount: true } });
  const paidByStudent = new Map(grouped.map((g) => [g.studentId, g._sum.amount ?? 0]));

  const students: BatchStudentRow[] = enrollments.map((e) => {
    const paid = paidByStudent.get(e.studentId) ?? 0;
    return {
      enrollmentId: e.id,
      studentId: e.studentId,
      studentName: e.student.name,
      admissionNumber: e.student.admissionNumber,
      className: e.student.class?.name ?? null,
      paid,
      balance: Math.max(0, b.feeAmount - paid),
      status: statusFor(b.feeAmount, paid),
    };
  });

  const rawPayments = await prisma.tuitionPayment.findMany({
    where: { batchId: id },
    orderBy: { date: "desc" },
    take: 50,
    include: { student: { select: { name: true } }, collectedBy: { select: { name: true } } },
  });
  const payments: BatchPaymentRow[] = rawPayments.map((p) => ({
    id: p.id, amount: p.amount, date: p.date.toISOString(), mode: p.mode, notes: p.notes,
    studentName: p.student.name, collectedByName: p.collectedBy?.name ?? "—",
  }));

  const collected = students.reduce((s, r) => s + r.paid, 0);
  const expected = b.feeAmount * students.length;
  const batch: BatchRow = {
    id: b.id, name: b.name, subject: b.subject, feeAmount: b.feeAmount, schedule: b.schedule,
    isActive: b.isActive, tutorId: b.tutorId, tutorName: b.tutor?.name ?? null,
    studentCount: students.length, expected, collected, pending: Math.max(0, expected - collected),
  };
  return { batch, students, payments };
}

// ---- Enrollment ----------------------------------------------------------

// Enroll a student into a batch. Verifies both belong to the school. Idempotent:
// re-enrolling an existing student returns "already".
export async function enrollStudent(batchId: string, studentId: string, schoolId: string) {
  const [batch, student] = await Promise.all([
    prisma.tuitionBatch.findFirst({ where: { id: batchId, schoolId }, select: { id: true } }),
    prisma.student.findFirst({ where: { id: studentId, schoolId }, select: { id: true } }),
  ]);
  if (!batch || !student) return "notfound" as const;
  const existing = await prisma.tuitionEnrollment.findUnique({ where: { batchId_studentId: { batchId, studentId } }, select: { id: true } });
  if (existing) return "already" as const;
  await prisma.tuitionEnrollment.create({ data: { batchId, studentId } });
  return "ok" as const;
}

// Remove an enrollment (scoped: the enrollment's batch must be in this school).
export async function unenrollStudent(enrollmentId: string, schoolId: string) {
  const e = await prisma.tuitionEnrollment.findFirst({ where: { id: enrollmentId, batch: { schoolId } }, select: { id: true } });
  if (!e) return false;
  await prisma.tuitionEnrollment.delete({ where: { id: enrollmentId } });
  return true;
}

// Active students available to enroll (for the add-student dropdown).
export async function listEnrollableStudents(schoolId: string) {
  return prisma.student.findMany({
    where: { schoolId },
    select: { id: true, name: true, admissionNumber: true },
    orderBy: { name: "asc" },
  });
}

// Active staff (principal/teacher) for the "tutor" dropdown on a batch.
export async function listTutors(schoolId: string) {
  return prisma.user.findMany({
    where: { schoolId, isActive: true, role: { in: ["PRINCIPAL", "TEACHER"] } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ---- Payments ------------------------------------------------------------

// Record a tuition payment. Verifies the batch + student belong to the school and
// the student is enrolled in the batch.
export async function recordTuitionPayment(
  input: { batchId: string; studentId: string; amount: number; mode?: string | null; notes?: string | null; date?: string | null },
  schoolId: string,
  collectedById: string
) {
  if (input.amount <= 0) return "invalid" as const;
  const enrollment = await prisma.tuitionEnrollment.findFirst({
    where: { batchId: input.batchId, studentId: input.studentId, batch: { schoolId } },
    select: { id: true },
  });
  if (!enrollment) return "notfound" as const;
  await prisma.tuitionPayment.create({
    data: {
      batchId: input.batchId, studentId: input.studentId, amount: Math.round(input.amount),
      mode: input.mode || "CASH", notes: clean(input.notes),
      date: input.date ? new Date(input.date) : new Date(),
      collectedById, schoolId,
    },
  });
  return "ok" as const;
}

// ---- Parent view ---------------------------------------------------------

export type ParentTuitionRow = {
  studentId: string;
  studentName: string;
  batchId: string;
  batchName: string;
  subject: string | null;
  schedule: string | null;
  feeAmount: number;
  paid: number;
  balance: number;
  status: FeeStatus;
};

// A parent's children's tuition enrollments with fee status (own children only).
export async function listParentTuitions(parentId: string, schoolId: string): Promise<ParentTuitionRow[]> {
  const enrollments = await prisma.tuitionEnrollment.findMany({
    where: { student: { parentId, schoolId }, batch: { schoolId } },
    include: {
      student: { select: { id: true, name: true } },
      batch: { select: { id: true, name: true, subject: true, schedule: true, feeAmount: true } },
    },
    orderBy: { batch: { name: "asc" } },
  });
  if (enrollments.length === 0) return [];

  // Sum each (student,batch) payment in one grouped query.
  const grouped = await prisma.tuitionPayment.groupBy({
    by: ["studentId", "batchId"],
    where: { schoolId, student: { parentId } },
    _sum: { amount: true },
  });
  const paidKey = (s: string, b: string) => `${s}|${b}`;
  const paidMap = new Map(grouped.map((g) => [paidKey(g.studentId, g.batchId), g._sum.amount ?? 0]));

  return enrollments.map((e) => {
    const paid = paidMap.get(paidKey(e.studentId, e.batchId)) ?? 0;
    return {
      studentId: e.studentId, studentName: e.student.name,
      batchId: e.batchId, batchName: e.batch.name, subject: e.batch.subject, schedule: e.batch.schedule,
      feeAmount: e.batch.feeAmount, paid, balance: Math.max(0, e.batch.feeAmount - paid),
      status: statusFor(e.batch.feeAmount, paid),
    };
  });
}
