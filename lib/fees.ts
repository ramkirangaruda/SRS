// Fee calculation layer. All money math lives here (in paise), used by both the
// API routes and Server Components. Everything is scoped by schoolId (and, for
// the parent functions, by parentId) so access control is structural.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { percent } from "@/lib/money";
import { statusFor, type FeeStatus } from "@/lib/fee-status";
import { sendPushNotification } from "@/lib/push";
import { logActivity } from "@/lib/activity";

// Re-export so existing importers can keep getting FeeStatus from lib/fees.
export type { FeeStatus };

// A typed error so routes can map failures to the right HTTP status.
export class FeeError extends Error {
  constructor(public code: "NOT_FOUND" | "INVALID_AMOUNT" | "EXCEEDS_BALANCE", message: string, public meta?: unknown) {
    super(message);
  }
}

// The id of the school's currently-active academic year (fees attach to it).
async function activeYearId(schoolId: string): Promise<string | null> {
  const ay = await prisma.academicYear.findFirst({
    where: { schoolId, isActive: true },
    select: { id: true },
  });
  return ay?.id ?? null;
}

// Map of classId -> annual fee (paise) for the active year. One small query.
async function feeMapForSchool(schoolId: string, yearId: string | null) {
  if (!yearId) return new Map<string, number>();
  const structures = await prisma.feeStructure.findMany({
    where: { schoolId, academicYearId: yearId },
    select: { classId: true, totalAmount: true },
  });
  return new Map(structures.map((s) => [s.classId, s.totalAmount]));
}

export type FeeSummary = {
  expected: number; // paise
  collected: number;
  pending: number;
  percentage: number;
  studentCount: number;
};

// SCHOOL-WIDE SUMMARY — computed with aggregate + groupBy, NOT by loading rows.
//   collected: ONE aggregate _sum over all payments (the DB adds them up).
//   expected:  groupBy students per class -> multiply each class count by its
//              fee -> sum. So even with 50,000 students this is two small queries.
export async function getFeeSummary(schoolId: string): Promise<FeeSummary> {
  const yearId = await activeYearId(schoolId);
  const fmap = await feeMapForSchool(schoolId, yearId);

  // groupBy: number of students in each class.
  const perClass = await prisma.student.groupBy({
    by: ["classId"],
    where: { schoolId },
    _count: { _all: true },
  });

  let expected = 0;
  let studentCount = 0;
  for (const g of perClass) {
    const count = g._count._all;
    studentCount += count;
    expected += (fmap.get(g.classId) ?? 0) * count;
  }

  // aggregate: total collected across the whole school in one query.
  const agg = await prisma.feePayment.aggregate({
    where: { schoolId },
    _sum: { amount: true },
  });
  const collected = agg._sum.amount ?? 0;

  const pending = Math.max(0, expected - collected);
  return { expected, collected, pending, percentage: percent(collected, expected), studentCount };
}

export type StudentFeeRow = {
  id: string;
  name: string;
  admissionNumber: string;
  className: string | null;
  sectionName: string | null;
  total: number; // paise
  paid: number;
  pending: number;
  status: FeeStatus;
};

export type ListStudentFeesParams = {
  schoolId: string;
  search?: string;
  classId?: string;
  status?: FeeStatus;
  page?: number;
  pageSize?: number;
};

const clean = (v?: string) => (v && v.trim() !== "" ? v : undefined);

// Build a StudentFeeRow[] from student records + a paid-per-student map.
function buildRows(
  students: { id: string; name: string; admissionNumber: string; classId: string; class: { name: string } | null; section: { name: string } | null }[],
  paidMap: Map<string, number>,
  fmap: Map<string, number>
): StudentFeeRow[] {
  return students.map((s) => {
    const total = fmap.get(s.classId) ?? 0;
    const paid = paidMap.get(s.id) ?? 0;
    return {
      id: s.id,
      name: s.name,
      admissionNumber: s.admissionNumber,
      className: s.class?.name ?? null,
      sectionName: s.section?.name ?? null,
      total,
      paid,
      pending: Math.max(0, total - paid),
      status: statusFor(total, paid),
    };
  });
}

// Sum payments per student for a set of ids, in ONE groupBy query.
async function paidPerStudent(studentIds: string[]): Promise<Map<string, number>> {
  if (studentIds.length === 0) return new Map();
  const grouped = await prisma.feePayment.groupBy({
    by: ["studentId"],
    where: { studentId: { in: studentIds } },
    _sum: { amount: true },
  });
  return new Map(grouped.map((g) => [g.studentId, g._sum.amount ?? 0]));
}

// PER-STUDENT FEE TABLE with search, class filter, status filter, pagination.
export async function listStudentFees(params: ListStudentFeesParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 10));
  const search = clean(params.search);
  const classId = clean(params.classId);
  const status = params.status;

  const yearId = await activeYearId(params.schoolId);
  const fmap = await feeMapForSchool(params.schoolId, yearId);

  const where: Prisma.StudentWhereInput = {
    schoolId: params.schoolId,
    ...(classId ? { classId } : {}),
    ...(search
      ? { OR: [{ name: { contains: search } }, { admissionNumber: { contains: search } }] }
      : {}),
  };

  const select = {
    id: true,
    name: true,
    admissionNumber: true,
    classId: true,
    class: { select: { name: true } },
    section: { select: { name: true } },
  } satisfies Prisma.StudentSelect;

  // Status is a DERIVED value (from totals), not a column — so it can't be a SQL
  // WHERE/LIMIT. When a status filter is active we must compute over the full
  // matching set, then filter + paginate in memory. Without it we paginate in SQL.
  if (status) {
    const all = await prisma.student.findMany({ where, select, orderBy: { admissionNumber: "asc" } });
    const paidMap = await paidPerStudent(all.map((s) => s.id));
    const rows = buildRows(all, paidMap, fmap).filter((r) => r.status === status);
    const total = rows.length;
    const data = rows.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      select,
      orderBy: { admissionNumber: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.student.count({ where }),
  ]);
  const paidMap = await paidPerStudent(students.map((s) => s.id));
  const data = buildRows(students, paidMap, fmap);
  return { data, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// A payment row enriched with who collected it and the running balance after it.
export type PaymentTimelineItem = {
  id: string;
  amount: number;
  date: Date;
  mode: string;
  receiptNumber: string;
  notes: string | null;
  collectedByName: string;
  runningBalance: number; // balance remaining AFTER this payment (paise)
};

export type StudentFeeDetail = {
  student: { id: string; name: string; admissionNumber: string; className: string | null; sectionName: string | null; photo: string | null };
  feeDescription: string | null;
  total: number;
  paid: number;
  pending: number;
  status: FeeStatus;
  payments: PaymentTimelineItem[];
};

// ONE student's full fee picture + payment history with a RUNNING BALANCE.
// We start at the full fee and subtract each payment in chronological order; the
// remainder after each is that payment's running balance — exactly like a bank
// statement. (whereExtra lets the parent version add an ownership filter.)
export async function getStudentFeeDetail(
  studentId: string,
  schoolId: string,
  whereExtra: Prisma.StudentWhereInput = {}
): Promise<StudentFeeDetail | null> {
  const student = await prisma.student.findFirst({
    where: { id: studentId, schoolId, ...whereExtra },
    select: {
      id: true,
      name: true,
      admissionNumber: true,
      photo: true,
      classId: true,
      class: { select: { name: true } },
      section: { select: { name: true } },
    },
  });
  if (!student) return null;

  const yearId = await activeYearId(schoolId);
  const feeStructure = yearId
    ? await prisma.feeStructure.findFirst({
        where: { schoolId, academicYearId: yearId, classId: student.classId },
        select: { totalAmount: true, description: true },
      })
    : null;
  const total = feeStructure?.totalAmount ?? 0;

  // Oldest first so the running balance reads top-to-bottom like a ledger.
  const rawPayments = await prisma.feePayment.findMany({
    where: { studentId, schoolId },
    orderBy: { date: "asc" },
    select: {
      id: true, amount: true, date: true, mode: true, receiptNumber: true, notes: true,
      collectedBy: { select: { name: true } },
    },
  });

  let remaining = total;
  const payments: PaymentTimelineItem[] = rawPayments.map((p) => {
    remaining -= p.amount;
    return {
      id: p.id,
      amount: p.amount,
      date: p.date,
      mode: p.mode,
      receiptNumber: p.receiptNumber,
      notes: p.notes,
      collectedByName: p.collectedBy?.name ?? "—",
      runningBalance: Math.max(0, remaining),
    };
  });

  const paid = rawPayments.reduce((s, p) => s + p.amount, 0);
  return {
    student: {
      id: student.id,
      name: student.name,
      admissionNumber: student.admissionNumber,
      className: student.class?.name ?? null,
      sectionName: student.section?.name ?? null,
      photo: student.photo,
    },
    feeDescription: feeStructure?.description ?? null,
    total,
    paid,
    pending: Math.max(0, total - paid),
    status: statusFor(total, paid),
    payments,
  };
}

export type RecordPaymentInput = {
  studentId: string;
  amount: number; // paise
  date: Date;
  mode: string;
  receiptNumber: string;
  notes?: string | null;
  collectedById: string;
  schoolId: string;
};

// RECORD A PAYMENT — inside a transaction so the "balance check" and the insert
// are atomic. We re-read the paid total INSIDE the transaction (never trust a
// number sent from the client), verify the new amount won't overshoot the
// balance, then insert. This is the guard against race conditions + overpayment.
export async function recordPayment(input: RecordPaymentInput) {
  if (input.amount <= 0) {
    throw new FeeError("INVALID_AMOUNT", "Amount must be greater than zero.");
  }

  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findFirst({
      where: { id: input.studentId, schoolId: input.schoolId },
      select: { classId: true },
    });
    if (!student) throw new FeeError("NOT_FOUND", "Student not found.");

    const yearId = await activeYearId(input.schoolId);
    const fs = yearId
      ? await tx.feeStructure.findFirst({
          where: { schoolId: input.schoolId, academicYearId: yearId, classId: student.classId },
          select: { totalAmount: true },
        })
      : null;
    const total = fs?.totalAmount ?? 0;

    const agg = await tx.feePayment.aggregate({
      where: { studentId: input.studentId },
      _sum: { amount: true },
    });
    const paid = agg._sum.amount ?? 0;
    const pending = Math.max(0, total - paid);

    if (input.amount > pending) {
      throw new FeeError("EXCEEDS_BALANCE", "Amount exceeds the pending balance.", { pending });
    }

    const payment = await tx.feePayment.create({
      data: {
        studentId: input.studentId,
        amount: input.amount,
        date: input.date,
        mode: input.mode,
        receiptNumber: input.receiptNumber,
        notes: input.notes ?? null,
        collectedById: input.collectedById,
        schoolId: input.schoolId,
      },
    });

    const newPaid = paid + input.amount;
    return {
      payment,
      total,
      paid: newPaid,
      pending: Math.max(0, total - newPaid),
      status: statusFor(total, newPaid),
      studentId: input.studentId,
    };
  }).then(async (res) => {
    // Notify the student's parent of the payment (FEES category, pref-gated).
    // After the transaction commits; fire-and-forget so push never blocks/rolls
    // back the payment.
    const child = await prisma.student.findUnique({ where: { id: res.studentId }, select: { name: true, parentId: true } });
    if (child?.parentId) {
      void sendPushNotification(child.parentId, { title: "Fee payment received", body: `₹${(input.amount / 100).toLocaleString("en-IN")} recorded for ${child.name}`, url: "/parent/fees", type: "FEES" });
    }
    void logActivity({ schoolId: input.schoolId, performedById: input.collectedById, action: "FEE_RECORDED", description: `Fee payment of ₹${(input.amount / 100).toLocaleString("en-IN")} received${child ? ` (${child.name})` : ""}`, entityType: "FeePayment" });
    return res;
  });
}

export type ClassReportRow = {
  classId: string;
  className: string;
  students: number;
  expected: number;
  collected: number;
  pending: number;
  percentage: number;
};

// CLASS-WISE REPORT. studentCount comes from a groupBy; collected per class uses
// a relation-filtered aggregate (where the payment's student is in that class).
// Classes are few, so the per-class aggregate loop is cheap and clear.
export async function getClassReport(schoolId: string): Promise<ClassReportRow[]> {
  const yearId = await activeYearId(schoolId);
  const fmap = await feeMapForSchool(schoolId, yearId);

  const classes = await prisma.class.findMany({
    where: { schoolId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const countsByClass = new Map(
    (
      await prisma.student.groupBy({ by: ["classId"], where: { schoolId }, _count: { _all: true } })
    ).map((g) => [g.classId, g._count._all])
  );

  const rows: ClassReportRow[] = [];
  for (const c of classes) {
    const students = countsByClass.get(c.id) ?? 0;
    const expected = (fmap.get(c.id) ?? 0) * students;
    const agg = await prisma.feePayment.aggregate({
      where: { schoolId, student: { classId: c.id } },
      _sum: { amount: true },
    });
    const collected = agg._sum.amount ?? 0;
    rows.push({
      classId: c.id,
      className: c.name,
      students,
      expected,
      collected,
      pending: Math.max(0, expected - collected),
      percentage: percent(collected, expected),
    });
  }
  return rows;
}

// PARENT: fee summary for each of a parent's children (ownership via parentId).
export async function getChildrenFees(parentId: string, schoolId: string): Promise<StudentFeeRow[]> {
  const yearId = await activeYearId(schoolId);
  const fmap = await feeMapForSchool(schoolId, yearId);
  const children = await prisma.student.findMany({
    where: { parentId, schoolId },
    select: {
      id: true, name: true, admissionNumber: true, classId: true,
      class: { select: { name: true } },
      section: { select: { name: true } },
    },
    orderBy: { name: "asc" },
  });
  const paidMap = await paidPerStudent(children.map((c) => c.id));
  return buildRows(children, paidMap, fmap);
}

// PARENT: one child's full fee detail, but only if it belongs to this parent.
export async function getChildFeeDetail(studentId: string, parentId: string, schoolId: string) {
  return getStudentFeeDetail(studentId, schoolId, { parentId });
}

// One payment with everything a printable receipt needs (school header, student,
// collector). Scoped to schoolId so a principal can't print another school's receipt.
export async function getPaymentReceipt(paymentId: string, schoolId: string) {
  return prisma.feePayment.findFirst({
    where: { id: paymentId, schoolId },
    select: {
      id: true,
      amount: true,
      date: true,
      mode: true,
      receiptNumber: true,
      notes: true,
      collectedBy: { select: { name: true } },
      student: {
        select: {
          name: true,
          admissionNumber: true,
          class: { select: { name: true } },
          section: { select: { name: true } },
        },
      },
      school: { select: { name: true, address: true, phone: true, email: true } },
    },
  });
}
