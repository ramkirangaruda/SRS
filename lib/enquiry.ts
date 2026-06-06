// Enquiry (admission funnel) data layer.
//
// The pipeline lives in `status`; the full history lives in EnquiryActivity. Every
// status change writes an activity row (from→to + note) so we keep an audit trail
// of HOW a lead progressed, not just where it is now.
import { prisma } from "@/lib/prisma";

export const ENQUIRY_STATUSES = ["NEW", "CONTACTED", "VISIT_SCHEDULED", "CONVERTED", "CLOSED"] as const;
export const ENQUIRY_SOURCES = ["WALKIN", "PHONE", "WEBSITE", "REFERRAL", "OTHER"] as const;
export const CLOSURE_REASONS = ["Not Interested", "Chose Other School", "Fees Too High", "Location", "Other"] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

const clean = (v?: string | null) => (v && v.trim() !== "" ? v.trim() : null);

const include = { category: { select: { name: true } } } as const;

export type EnquiryCard = {
  id: string; parentName: string; phone: string; email: string | null; childName: string | null;
  classInterestedIn: string | null; source: string; status: string; categoryId: string | null;
  categoryName: string | null; followUpDate: string | null; closureReason: string | null;
  convertedToAdmissionId: string | null; createdAt: string;
};

type Row = {
  id: string; parentName: string; phone: string; email: string | null; childName: string | null;
  classInterestedIn: string | null; source: string; status: string; categoryId: string | null;
  followUpDate: Date | null; closureReason: string | null; convertedToAdmissionId: string | null; createdAt: Date;
  category: { name: string } | null;
};

function toCard(e: Row): EnquiryCard {
  return {
    id: e.id, parentName: e.parentName, phone: e.phone, email: e.email, childName: e.childName,
    classInterestedIn: e.classInterestedIn, source: e.source, status: e.status, categoryId: e.categoryId,
    categoryName: e.category?.name ?? null, followUpDate: e.followUpDate?.toISOString() ?? null,
    closureReason: e.closureReason, convertedToAdmissionId: e.convertedToAdmissionId, createdAt: e.createdAt.toISOString(),
  };
}

export async function listEnquiries(schoolId: string, opts: { status?: string; categoryId?: string; source?: string; classInterestedIn?: string; search?: string; page?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 50;
  const where = {
    schoolId,
    ...(clean(opts.status) ? { status: opts.status } : {}),
    ...(clean(opts.categoryId) ? { categoryId: opts.categoryId } : {}),
    ...(clean(opts.source) ? { source: opts.source } : {}),
    ...(clean(opts.classInterestedIn) ? { classInterestedIn: opts.classInterestedIn } : {}),
    ...(clean(opts.search) ? { OR: [{ parentName: { contains: opts.search } }, { childName: { contains: opts.search } }, { phone: { contains: opts.search } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.enquiry.findMany({ where, include, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.enquiry.count({ where }),
  ]);
  return { data: rows.map(toCard), total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// Grouped by status, for the Kanban board.
export async function listEnquiriesGrouped(schoolId: string) {
  const rows = await prisma.enquiry.findMany({ where: { schoolId, status: { not: "" } }, include, orderBy: { createdAt: "desc" } });
  const grouped: Record<string, EnquiryCard[]> = {};
  for (const s of ENQUIRY_STATUSES) grouped[s] = [];
  for (const r of rows) (grouped[r.status] ??= []).push(toCard(r));
  return grouped;
}

export async function getEnquiry(id: string, schoolId: string) {
  const e = await prisma.enquiry.findFirst({
    where: { id, schoolId },
    include: { category: { select: { name: true } }, activities: { include: { performedBy: { select: { name: true } } }, orderBy: { createdAt: "desc" } } },
  });
  if (!e) return null;
  return {
    ...toCard(e),
    address: e.address, message: e.message, subject: e.subject, childAge: e.childAge, childGender: e.childGender, currentSchool: e.currentSchool,
    activities: e.activities.map((a) => ({ id: a.id, activityType: a.activityType, fromStatus: a.fromStatus, toStatus: a.toStatus, note: a.note, performedByName: a.performedBy?.name ?? null, createdAt: a.createdAt.toISOString() })),
  };
}

export async function createEnquiry(input: Record<string, unknown>, schoolId: string, userId: string) {
  const e = await prisma.enquiry.create({
    data: {
      parentName: String(input.parentName), phone: String(input.phone), email: clean(input.email as string),
      address: clean(input.address as string), childName: clean(input.childName as string), childAge: clean(input.childAge as string),
      childGender: clean(input.childGender as string), currentSchool: clean(input.currentSchool as string),
      classInterestedIn: clean(input.classInterestedIn as string), source: (input.source as string) || "OTHER",
      categoryId: clean(input.categoryId as string), message: clean(input.message as string),
      followUpDate: input.followUpDate ? new Date(input.followUpDate as string) : null, status: "NEW", schoolId,
      activities: { create: { activityType: "STATUS_CHANGE", toStatus: "NEW", note: "Enquiry created", performedById: userId } },
    },
    include,
  });
  return toCard(e);
}

export async function updateEnquiry(id: string, input: Record<string, unknown>, schoolId: string) {
  const existing = await prisma.enquiry.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!existing) return null;
  const e = await prisma.enquiry.update({
    where: { id },
    data: {
      parentName: String(input.parentName), phone: String(input.phone), email: clean(input.email as string),
      address: clean(input.address as string), childName: clean(input.childName as string), childAge: clean(input.childAge as string),
      childGender: clean(input.childGender as string), currentSchool: clean(input.currentSchool as string),
      classInterestedIn: clean(input.classInterestedIn as string), source: (input.source as string) || "OTHER",
      categoryId: clean(input.categoryId as string), message: clean(input.message as string),
      followUpDate: input.followUpDate ? new Date(input.followUpDate as string) : null,
    },
    include,
  });
  return toCard(e);
}

// Move through the pipeline. Records a STATUS_CHANGE activity. Certain transitions
// carry extra data (note, visit date, closure reason) captured in the note.
export async function changeStatus(id: string, schoolId: string, toStatus: string, userId: string, opts: { note?: string | null; followUpDate?: string | null; closureReason?: string | null } = {}) {
  const e = await prisma.enquiry.findFirst({ where: { id, schoolId }, select: { status: true } });
  if (!e) return null;
  const updated = await prisma.enquiry.update({
    where: { id },
    data: {
      status: toStatus,
      ...(opts.followUpDate ? { followUpDate: new Date(opts.followUpDate) } : {}),
      ...(opts.closureReason ? { closureReason: opts.closureReason } : {}),
      activities: { create: { activityType: "STATUS_CHANGE", fromStatus: e.status, toStatus, note: clean(opts.note) ?? clean(opts.closureReason), performedById: userId } },
    },
  });
  return updated;
}

// Add a note / log a call WITHOUT changing status.
export async function addActivity(id: string, schoolId: string, userId: string, activityType: string, note: string, followUpDate?: string | null) {
  const e = await prisma.enquiry.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!e) return null;
  await prisma.enquiry.update({
    where: { id },
    data: {
      ...(followUpDate ? { followUpDate: new Date(followUpDate) } : {}),
      activities: { create: { activityType, note: clean(note), performedById: userId } },
    },
  });
  return true;
}

// Delete — only NEW or CLOSED enquiries (don't lose mid-pipeline history).
export async function deleteEnquiry(id: string, schoolId: string) {
  const e = await prisma.enquiry.findFirst({ where: { id, schoolId }, select: { status: true } });
  if (!e) return "notfound" as const;
  if (e.status !== "NEW" && e.status !== "CLOSED") return "forbidden" as const;
  await prisma.enquiry.delete({ where: { id } });
  return "ok" as const;
}

// STATS: funnel counts, source breakdown, monthly trend.
export async function enquiryStats(schoolId: string) {
  const byStatus = await prisma.enquiry.groupBy({ by: ["status"], where: { schoolId }, _count: { _all: true } });
  const funnel: Record<string, number> = {};
  for (const s of ENQUIRY_STATUSES) funnel[s] = 0;
  for (const r of byStatus) funnel[r.status] = r._count._all;

  const bySource = await prisma.enquiry.groupBy({ by: ["source"], where: { schoolId }, _count: { _all: true } });
  const sources = bySource.map((r) => ({ source: r.source, count: r._count._all }));

  // Monthly trend (last 12 months), bucketed in JS.
  const since = new Date(); since.setMonth(since.getMonth() - 11); since.setDate(1);
  const recent = await prisma.enquiry.findMany({ where: { schoolId, createdAt: { gte: since } }, select: { createdAt: true } });
  const byMonth: Record<string, number> = {};
  for (const r of recent) { const k = `${r.createdAt.getFullYear()}-${String(r.createdAt.getMonth() + 1).padStart(2, "0")}`; byMonth[k] = (byMonth[k] ?? 0) + 1; }
  const trend: { month: string; count: number }[] = [];
  for (let i = 0; i < 12; i++) { const d = new Date(since.getFullYear(), since.getMonth() + i, 1); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; trend.push({ month: k, count: byMonth[k] ?? 0 }); }

  return { funnel, sources, trend };
}

// Follow-ups due today (for the dashboard reminder).
export async function followUpsToday(schoolId: string) {
  const s = new Date(); s.setHours(0, 0, 0, 0); const e = new Date(); e.setHours(23, 59, 59, 999);
  return prisma.enquiry.findMany({
    where: { schoolId, followUpDate: { gte: s, lte: e }, status: { notIn: ["CONVERTED", "CLOSED"] } },
    select: { id: true, parentName: true, childName: true, phone: true, status: true }, orderBy: { followUpDate: "asc" },
  });
}

// ---- CATEGORIES ----
export async function listCategories(schoolId: string) {
  return prisma.enquiryCategory.findMany({ where: { schoolId }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}
export async function createCategory(name: string, schoolId: string) {
  return prisma.enquiryCategory.create({ data: { name, schoolId }, select: { id: true, name: true } });
}
export async function updateCategory(id: string, name: string, schoolId: string) {
  const c = await prisma.enquiryCategory.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!c) return null;
  return prisma.enquiryCategory.update({ where: { id }, data: { name }, select: { id: true, name: true } });
}
export async function deleteCategory(id: string, schoolId: string) {
  const c = await prisma.enquiryCategory.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!c) return false;
  await prisma.enquiryCategory.delete({ where: { id } });
  return true;
}
