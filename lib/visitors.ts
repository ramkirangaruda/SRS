// Visitors register data layer.
//
// Check-in time DEFAULTS to "now" but is editable: the form sends an explicit
// checkInTime, so if the receptionist logs someone 30 min late they just pick the
// real arrival time. "Still on premises" = checkOutTime is null.
import { prisma } from "@/lib/prisma";
import { dateUTCFromKey, todayKey } from "@/lib/calendar";

export const PURPOSES = ["PARENT_VISIT", "VENDOR", "OFFICIAL", "INTERVIEW", "MAINTENANCE", "OTHER"] as const;
export const ID_PROOF_TYPES = ["AADHAAR", "DRIVING_LICENSE", "VOTER_ID", "PASSPORT", "OTHER"] as const;
const REPEAT_THRESHOLD = 3; // > this many total visits → "Repeat Visitor"

const clean = (v?: string | null) => (v && v.trim() !== "" ? v.trim() : null);

export type VisitorRow = {
  id: string; name: string; phone: string; purpose: string; purposeOther: string | null;
  visitingWhomId: string | null; visitingWhomName: string | null;
  checkInTime: string; checkOutTime: string | null; idProofType: string | null; idNumber: string | null;
  notes: string | null; onPremises: boolean; isRepeat: boolean;
};

const include = { visitingWhom: { select: { name: true } } } as const;
type Row = {
  id: string; name: string; phone: string; purpose: string; purposeOther: string | null; visitingWhomId: string | null;
  checkInTime: Date; checkOutTime: Date | null; idProofType: string | null; idNumber: string | null; notes: string | null;
  visitingWhom: { name: string } | null;
};

function toRow(v: Row, repeatPhones: Set<string>): VisitorRow {
  return {
    id: v.id, name: v.name, phone: v.phone, purpose: v.purpose, purposeOther: v.purposeOther,
    visitingWhomId: v.visitingWhomId, visitingWhomName: v.visitingWhom?.name ?? null,
    checkInTime: v.checkInTime.toISOString(), checkOutTime: v.checkOutTime?.toISOString() ?? null,
    idProofType: v.idProofType, idNumber: v.idNumber, notes: v.notes,
    onPremises: !v.checkOutTime, isRepeat: repeatPhones.has(v.phone),
  };
}

// Mark which phone numbers in a set are "repeat" (> threshold total visits). We do
// this with ONE grouped query over all the phones, rather than a per-row subquery.
async function repeatPhoneSet(schoolId: string, phones: string[]): Promise<Set<string>> {
  if (phones.length === 0) return new Set();
  const grouped = await prisma.visitorRegister.groupBy({
    by: ["phone"], where: { schoolId, phone: { in: phones } }, _count: { _all: true },
  });
  return new Set(grouped.filter((g) => g._count._all > REPEAT_THRESHOLD).map((g) => g.phone));
}

// LIST with filters. `date=today` → today only; or a from/to range; plus search +
// purpose + pagination.
export async function listVisitors(schoolId: string, opts: { date?: string; from?: string; to?: string; search?: string; purpose?: string; page?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 25;
  let checkInTime: { gte?: Date; lte?: Date } | undefined;
  if (opts.date === "today") {
    const start = dateUTCFromKey(todayKey());
    // "today" in local terms is tricky with UTC keys; use a wide local-day window.
    const s = new Date(); s.setHours(0, 0, 0, 0); const e = new Date(); e.setHours(23, 59, 59, 999);
    checkInTime = { gte: s, lte: e };
    void start;
  } else if (opts.from || opts.to) {
    checkInTime = {};
    if (opts.from) checkInTime.gte = new Date(`${opts.from}T00:00:00`);
    if (opts.to) checkInTime.lte = new Date(`${opts.to}T23:59:59`);
  }
  const where = {
    schoolId,
    ...(checkInTime ? { checkInTime } : {}),
    ...(clean(opts.purpose) ? { purpose: opts.purpose } : {}),
    ...(clean(opts.search) ? { OR: [{ name: { contains: opts.search, mode: "insensitive" as const } }, { phone: { contains: opts.search, mode: "insensitive" as const } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.visitorRegister.findMany({ where, include, orderBy: { checkInTime: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.visitorRegister.count({ where }),
  ]);
  const repeats = await repeatPhoneSet(schoolId, Array.from(new Set(rows.map((r) => r.phone))));
  return { data: rows.map((r) => toRow(r, repeats)), total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function todayCounts(schoolId: string) {
  const s = new Date(); s.setHours(0, 0, 0, 0); const e = new Date(); e.setHours(23, 59, 59, 999);
  const [total, onPremises] = await Promise.all([
    prisma.visitorRegister.count({ where: { schoolId, checkInTime: { gte: s, lte: e } } }),
    prisma.visitorRegister.count({ where: { schoolId, checkOutTime: null } }),
  ]);
  return { total, onPremises };
}

export async function createVisitor(input: { name: string; phone: string; purpose: string; purposeOther?: string | null; visitingWhomId?: string | null; checkInTime?: string | null; idProofType?: string | null; idNumber?: string | null; notes?: string | null }, schoolId: string) {
  const v = await prisma.visitorRegister.create({
    data: {
      name: input.name, phone: input.phone, purpose: input.purpose, purposeOther: clean(input.purposeOther),
      visitingWhomId: clean(input.visitingWhomId), checkInTime: input.checkInTime ? new Date(input.checkInTime) : new Date(),
      idProofType: clean(input.idProofType), idNumber: clean(input.idNumber), notes: clean(input.notes), schoolId,
    },
    include,
  });
  return toRow(v, new Set());
}

export async function checkoutVisitor(id: string, schoolId: string) {
  const v = await prisma.visitorRegister.findFirst({ where: { id, schoolId }, select: { id: true, checkOutTime: true } });
  if (!v) return "notfound" as const;
  if (v.checkOutTime) return "already" as const;
  await prisma.visitorRegister.update({ where: { id }, data: { checkOutTime: new Date() } });
  return "ok" as const;
}

export async function updateVisitor(id: string, input: { name: string; phone: string; purpose: string; purposeOther?: string | null; visitingWhomId?: string | null; checkInTime?: string | null; checkOutTime?: string | null; idProofType?: string | null; idNumber?: string | null; notes?: string | null }, schoolId: string) {
  const existing = await prisma.visitorRegister.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!existing) return null;
  const v = await prisma.visitorRegister.update({
    where: { id },
    data: {
      name: input.name, phone: input.phone, purpose: input.purpose, purposeOther: clean(input.purposeOther),
      visitingWhomId: clean(input.visitingWhomId),
      checkInTime: input.checkInTime ? new Date(input.checkInTime) : undefined,
      checkOutTime: input.checkOutTime ? new Date(input.checkOutTime) : null,
      idProofType: clean(input.idProofType), idNumber: clean(input.idNumber), notes: clean(input.notes),
    },
    include,
  });
  return toRow(v, new Set());
}

export async function deleteVisitor(id: string, schoolId: string) {
  const existing = await prisma.visitorRegister.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!existing) return false;
  await prisma.visitorRegister.delete({ where: { id } });
  return true;
}

// ANALYTICS: month totals, daily average, purpose breakdown, peak hour, and a
// per-day series for the bar chart.
export async function visitorStats(schoolId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const rows = await prisma.visitorRegister.findMany({
    where: { schoolId, checkInTime: { gte: monthStart, lte: monthEnd } },
    select: { checkInTime: true, purpose: true },
  });
  const total = rows.length;
  const daysElapsed = now.getDate();
  const dailyAverage = daysElapsed ? Math.round((total / daysElapsed) * 10) / 10 : 0;

  // Purpose breakdown.
  const purposeCounts: Record<string, number> = {};
  for (const r of rows) purposeCounts[r.purpose] = (purposeCounts[r.purpose] ?? 0) + 1;
  const mostCommonPurpose = Object.entries(purposeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Peak hour (group by hour-of-day of check-in).
  const hourCounts: Record<number, number> = {};
  for (const r of rows) { const h = r.checkInTime.getHours(); hourCounts[h] = (hourCounts[h] ?? 0) + 1; }
  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Per-day series for the current month (bar chart). We bucket in JS because
  // SQLite has no clean date_trunc; the dataset (one month) is small.
  const perDay: { day: number; count: number }[] = [];
  const byDay: Record<number, number> = {};
  for (const r of rows) { const d = r.checkInTime.getDate(); byDay[d] = (byDay[d] ?? 0) + 1; }
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) perDay.push({ day: d, count: byDay[d] ?? 0 });

  return { total, dailyAverage, mostCommonPurpose, peakHour: peakHour != null ? Number(peakHour) : null, purposeCounts, perDay };
}

// Active staff for the "visiting whom" dropdown.
export async function listHosts(schoolId: string) {
  return prisma.user.findMany({ where: { schoolId, isActive: true, role: { in: ["PRINCIPAL", "TEACHER"] } }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}

// For CSV/PDF export — all visitors in a range (no pagination).
export async function exportVisitors(schoolId: string, from?: string, to?: string) {
  const where = {
    schoolId,
    ...(from || to ? { checkInTime: { ...(from ? { gte: new Date(`${from}T00:00:00`) } : {}), ...(to ? { lte: new Date(`${to}T23:59:59`) } : {}) } } : {}),
  };
  const rows = await prisma.visitorRegister.findMany({ where, include, orderBy: { checkInTime: "desc" } });
  return rows.map((r) => toRow(r, new Set()));
}
