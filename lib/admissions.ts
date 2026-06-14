// Admissions data layer — the application → enrolment process.
//
// The headline operation is APPROVE: in ONE transaction we generate an admission
// number, create the Student, find-or-create the parent User, link everything, and
// flip the application to APPROVED. Atomicity matters — if any step throws, the
// whole thing rolls back so we never get a Student with no parent, or a number
// burned with no student behind it.
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ROLES } from "@/lib/roles";
import { Prisma } from "@prisma/client";

export const ADMISSION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const ADMISSION_SOURCES = ["DIRECT", "WEBSITE", "REFERRAL", "ADVERTISEMENT", "ENQUIRY"] as const;

const clean = (v?: string | null) => (v && v.trim() !== "" ? v.trim() : null);

// A short school code from the school name initials, e.g. "Springfield Public
// School" → "SPS". Falls back to "SCH".
function schoolCode(name: string): string {
  const code = name.split(/\s+/).map((w) => w[0]).filter(Boolean).join("").toUpperCase().slice(0, 4);
  return code || "SCH";
}

// The next admission number for the active year, e.g. "SPS/2026/0043".
// We find the highest existing sequence for this year's prefix and add 1.
export async function computeNextNumber(schoolId: string): Promise<string> {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });
  const year = new Date().getFullYear();
  const prefix = `${schoolCode(school?.name ?? "")}/${year}/`;
  // Look at Student.admissionNumber (the source of truth, and it's UNIQUE).
  const existing = await prisma.student.findMany({ where: { schoolId, admissionNumber: { startsWith: prefix } }, select: { admissionNumber: true } });
  let max = 0;
  for (const s of existing) {
    const seq = parseInt(s.admissionNumber.slice(prefix.length), 10);
    if (!isNaN(seq) && seq > max) max = seq;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}

const include = {
  enquiry: { select: { id: true } },
  assignedClass: { select: { name: true } },
  assignedSection: { select: { name: true } },
} as const;

export type AdmissionCard = {
  id: string; studentName: string; parentName: string; phone: string; classAppliedFor: string; status: string;
  source: string; enquiryId: string | null; assignedAdmissionNumber: string | null; createdAt: string;
};

function toCard(a: { id: string; studentName: string; parentName: string; phone: string; classAppliedFor: string; status: string; source: string; enquiryId: string | null; assignedAdmissionNumber: string | null; createdAt: Date }): AdmissionCard {
  return { id: a.id, studentName: a.studentName, parentName: a.parentName, phone: a.phone, classAppliedFor: a.classAppliedFor, status: a.status, source: a.source, enquiryId: a.enquiryId, assignedAdmissionNumber: a.assignedAdmissionNumber, createdAt: a.createdAt.toISOString() };
}

export async function listAdmissions(schoolId: string, opts: { status?: string; classAppliedFor?: string; source?: string; search?: string; page?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 50;
  const where = {
    schoolId,
    ...(clean(opts.status) ? { status: opts.status } : {}),
    ...(clean(opts.classAppliedFor) ? { classAppliedFor: opts.classAppliedFor } : {}),
    ...(clean(opts.source) ? { source: opts.source } : {}),
    ...(clean(opts.search) ? { OR: [{ studentName: { contains: opts.search, mode: "insensitive" as const } }, { parentName: { contains: opts.search, mode: "insensitive" as const } }, { phone: { contains: opts.search, mode: "insensitive" as const } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.admissionQuery.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.admissionQuery.count({ where }),
  ]);
  return { data: rows.map(toCard), total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function listAdmissionsGrouped(schoolId: string) {
  const rows = await prisma.admissionQuery.findMany({ where: { schoolId }, orderBy: { createdAt: "desc" } });
  const grouped: Record<string, AdmissionCard[]> = { PENDING: [], APPROVED: [], REJECTED: [] };
  for (const r of rows) (grouped[r.status] ??= []).push(toCard(r));
  return grouped;
}

export async function getAdmission(id: string, schoolId: string) {
  const a = await prisma.admissionQuery.findFirst({
    where: { id, schoolId },
    include: { ...include, activities: { include: { performedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } } },
  });
  if (!a) return null;
  return {
    id: a.id, studentName: a.studentName, dateOfBirth: a.dateOfBirth?.toISOString() ?? null, gender: a.gender, bloodGroup: a.bloodGroup,
    previousSchool: a.previousSchool, classAppliedFor: a.classAppliedFor, parentName: a.parentName, motherName: a.motherName,
    phone: a.phone, email: a.email, address: a.address, occupation: a.occupation,
    documents: a.documents ? (JSON.parse(a.documents) as { name: string; type: string; url: string }[]) : [],
    source: a.source, status: a.status, notes: a.notes, enquiryId: a.enquiryId,
    assignedAdmissionNumber: a.assignedAdmissionNumber, assignedClassName: a.assignedClass?.name ?? null, assignedSectionName: a.assignedSection?.name ?? null,
    rejectionReason: a.rejectionReason, processedAt: a.processedAt?.toISOString() ?? null, createdAt: a.createdAt.toISOString(),
    activities: a.activities.map((x) => ({ id: x.id, activityType: x.activityType, note: x.note, performedByName: x.performedBy?.name ?? null, createdAt: x.createdAt.toISOString() })),
  };
}

// CREATE an application. If enquiryId is given, link both directions and mark the
// enquiry CONVERTED (bidirectional sync, in one transaction).
export async function createApplication(input: Record<string, unknown>, schoolId: string, userId: string) {
  const enquiryId = clean(input.enquiryId as string);
  return prisma.$transaction(async (tx) => {
    const a = await tx.admissionQuery.create({
      data: {
        studentName: String(input.studentName), dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth as string) : null,
        gender: clean(input.gender as string), bloodGroup: clean(input.bloodGroup as string), previousSchool: clean(input.previousSchool as string),
        classAppliedFor: String(input.classAppliedFor), parentName: String(input.parentName || "—"), motherName: clean(input.motherName as string),
        phone: String(input.phone), email: clean(input.email as string), address: clean(input.address as string), occupation: clean(input.occupation as string),
        documents: input.documents ? JSON.stringify(input.documents) : null, source: (input.source as string) || "DIRECT",
        enquiryId, status: "PENDING", schoolId,
        activities: { create: { activityType: "STATUS_CHANGE", note: "Application received", performedById: userId } },
      },
    });
    if (enquiryId) {
      // Point the enquiry at this admission + mark converted (keeps both in sync).
      await tx.enquiry.update({ where: { id: enquiryId }, data: { convertedToAdmissionId: a.id, status: "CONVERTED" } });
    }
    return a;
  });
}

export async function updateApplication(id: string, input: Record<string, unknown>, schoolId: string) {
  const existing = await prisma.admissionQuery.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!existing) return null;
  return prisma.admissionQuery.update({
    where: { id },
    data: {
      studentName: String(input.studentName), dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth as string) : null,
      gender: clean(input.gender as string), bloodGroup: clean(input.bloodGroup as string), previousSchool: clean(input.previousSchool as string),
      classAppliedFor: String(input.classAppliedFor), parentName: String(input.parentName || "—"), motherName: clean(input.motherName as string),
      phone: String(input.phone), email: clean(input.email as string), address: clean(input.address as string), occupation: clean(input.occupation as string),
      source: (input.source as string) || "DIRECT",
    },
  });
}

export type ApproveResult =
  | { ok: true; admissionNumber: string; parentEmail: string; tempPassword: string | null; studentId: string }
  | { ok: false; error: string };

// APPROVE — the atomic multi-record creation. Retries on a unique-number clash.
export async function approveApplication(id: string, schoolId: string, userId: string, input: { classId: string; sectionId?: string | null }): Promise<ApproveResult> {
  const app = await prisma.admissionQuery.findFirst({ where: { id, schoolId } });
  if (!app) return { ok: false, error: "Not found" };
  if (app.status === "APPROVED") return { ok: false, error: "Already approved" };

  // Try up to 3 times: if two approvals race for the same admission number, the
  // unique constraint on Student.admissionNumber throws (P2002) and we recompute.
  for (let attempt = 0; attempt < 3; attempt++) {
    const admissionNumber = await computeNextNumber(schoolId);
    // Determine parent credentials OUTSIDE the txn (hashing is slow); the txn does
    // the writes. We re-check existence inside to stay correct.
    const parentEmail = app.email || `${app.phone}@parent.local`;
    let tempPassword: string | null = null;
    const existingParent = await prisma.user.findUnique({ where: { email: parentEmail }, select: { id: true } });
    let passwordHash: string | null = null;
    if (!existingParent) { tempPassword = `Parent-${Math.floor(1000 + Math.random() * 9000)}`; passwordHash = await bcrypt.hash(tempPassword, 10); }

    try {
      const studentId = await prisma.$transaction(async (tx) => {
        // 1. Find or create the parent User.
        let parent = await tx.user.findUnique({ where: { email: parentEmail }, select: { id: true } });
        if (!parent) {
          parent = await tx.user.create({ data: { name: app.parentName, email: parentEmail, phone: app.phone, password: passwordHash!, role: ROLES.PARENT, schoolId }, select: { id: true } });
        }
        // 2. Create the Student (admissionNumber is UNIQUE — the race guard).
        const student = await tx.student.create({
          data: {
            name: app.studentName, admissionNumber, dateOfBirth: app.dateOfBirth, gender: app.gender, bloodGroup: app.bloodGroup,
            address: app.address, classId: input.classId, sectionId: clean(input.sectionId) ?? null, parentId: parent.id, schoolId,
          },
          select: { id: true },
        });
        // 3. Flip the application to APPROVED with the assignments + processor.
        await tx.admissionQuery.update({
          where: { id },
          data: { status: "APPROVED", assignedAdmissionNumber: admissionNumber, assignedClassId: input.classId, assignedSectionId: clean(input.sectionId) ?? null, processedById: userId, processedAt: new Date() },
        });
        // 4. Activity log.
        await tx.admissionActivity.create({ data: { admissionId: id, activityType: "APPROVED", note: `Approved · ${admissionNumber}`, performedById: userId } });
        return student.id;
      });
      return { ok: true, admissionNumber, parentEmail, tempPassword, studentId };
    } catch (e) {
      // Unique violation on admissionNumber → another approval grabbed it; retry.
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") continue;
      throw e;
    }
  }
  return { ok: false, error: "Could not allocate an admission number, please retry" };
}

export async function rejectApplication(id: string, schoolId: string, userId: string, reason: string) {
  const app = await prisma.admissionQuery.findFirst({ where: { id, schoolId }, select: { id: true, status: true } });
  if (!app) return false;
  await prisma.$transaction([
    prisma.admissionQuery.update({ where: { id }, data: { status: "REJECTED", rejectionReason: reason, processedById: userId, processedAt: new Date() } }),
    prisma.admissionActivity.create({ data: { admissionId: id, activityType: "REJECTED", note: reason, performedById: userId } }),
  ]);
  return true;
}

export async function addActivity(id: string, schoolId: string, userId: string, note: string) {
  const app = await prisma.admissionQuery.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!app) return false;
  await prisma.admissionActivity.create({ data: { admissionId: id, activityType: "NOTE", note, performedById: userId } });
  return true;
}

export async function admissionStats(schoolId: string) {
  const byStatus = await prisma.admissionQuery.groupBy({ by: ["status"], where: { schoolId }, _count: { _all: true } });
  const counts: Record<string, number> = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
  for (const r of byStatus) counts[r.status] = r._count._all;
  const total = counts.PENDING + counts.APPROVED + counts.REJECTED;
  const decided = counts.APPROVED + counts.REJECTED;
  const approvalRate = decided ? Math.round((counts.APPROVED / decided) * 100) : 0;

  const byClass = await prisma.admissionQuery.groupBy({ by: ["classAppliedFor"], where: { schoolId }, _count: { _all: true } });
  const classBreakdown = byClass.map((r) => ({ className: r.classAppliedFor, count: r._count._all })).sort((a, b) => b.count - a.count);

  const since = new Date(); since.setMonth(since.getMonth() - 11); since.setDate(1);
  const recent = await prisma.admissionQuery.findMany({ where: { schoolId, createdAt: { gte: since } }, select: { createdAt: true } });
  const byMonth: Record<string, number> = {};
  for (const r of recent) { const k = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, "0")}`; byMonth[k] = (byMonth[k] ?? 0) + 1; }
  const trend: { month: string; count: number }[] = [];
  for (let i = 0; i < 12; i++) { const d = new Date(since.getFullYear(), since.getMonth() + i, 1); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; trend.push({ month: k, count: byMonth[k] ?? 0 }); }

  return { counts, total, approvalRate, classBreakdown, trend };
}

// Prefill payload from an enquiry, for "convert to admission".
export async function enquiryPrefill(enquiryId: string, schoolId: string) {
  const e = await prisma.enquiry.findFirst({ where: { id: enquiryId, schoolId } });
  if (!e) return null;
  return { enquiryId: e.id, studentName: e.childName ?? "", parentName: e.parentName, phone: e.phone, email: e.email ?? "", classAppliedFor: e.classInterestedIn ?? "", gender: e.childGender ?? "", previousSchool: e.currentSchool ?? "", address: e.address ?? "" };
}
