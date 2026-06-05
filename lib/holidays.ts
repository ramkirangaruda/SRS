// Holidays data layer. Holidays are school-wide (no per-class scoping), so the
// parent and principal read the same data.
import { prisma } from "@/lib/prisma";
import { dayKey, dateUTCFromKey, todayKey, daysBetweenKeys } from "@/lib/calendar";

export const HOLIDAY_TYPES = ["NATIONAL", "FESTIVAL", "BREAK", "OTHER"] as const;

export type HolidayItem = {
  id: string;
  name: string;
  date: string;
  endDate: string | null;
  description: string | null;
  type: string;
};

function toItem(h: { id: string; name: string; date: Date; endDate: Date | null; description: string | null; type: string }): HolidayItem {
  return { id: h.id, name: h.name, date: h.date.toISOString(), endDate: h.endDate?.toISOString() ?? null, description: h.description, type: h.type };
}

export async function listHolidays(schoolId: string): Promise<HolidayItem[]> {
  const rows = await prisma.holiday.findMany({ where: { schoolId }, orderBy: { date: "asc" } });
  return rows.map(toItem);
}

// The nearest holiday today or later (for the "Next Holiday" countdown card).
export async function nextHoliday(schoolId: string): Promise<(HolidayItem & { inDays: number }) | null> {
  const today = todayKey();
  const rows = await prisma.holiday.findMany({
    where: { schoolId, OR: [{ date: { gte: dateUTCFromKey(today) } }, { endDate: { gte: dateUTCFromKey(today) } }] },
    orderBy: { date: "asc" },
    take: 1,
  });
  if (rows.length === 0) return null;
  const h = toItem(rows[0]);
  return { ...h, inDays: Math.max(0, daysBetweenKeys(today, dayKey(h.date))) };
}

export async function createHoliday(schoolId: string, input: { name: string; date: string; endDate?: string; description?: string; type: string }) {
  return prisma.holiday.create({
    data: {
      name: input.name,
      date: dateUTCFromKey(input.date),
      endDate: input.endDate ? dateUTCFromKey(input.endDate) : null,
      description: input.description || null,
      type: input.type,
      schoolId,
    },
  });
}

// BULK create from parsed CSV rows, in ONE transaction (all-or-nothing).
export async function bulkCreateHolidays(schoolId: string, rows: { name: string; date: string; type: string }[]) {
  return prisma.$transaction(
    rows.map((r) =>
      prisma.holiday.create({ data: { name: r.name, date: dateUTCFromKey(r.date), type: r.type, schoolId } })
    )
  );
}

export async function updateHoliday(id: string, schoolId: string, input: { name: string; date: string; endDate?: string; description?: string; type: string }) {
  const r = await prisma.holiday.updateMany({
    where: { id, schoolId },
    data: { name: input.name, date: dateUTCFromKey(input.date), endDate: input.endDate ? dateUTCFromKey(input.endDate) : null, description: input.description || null, type: input.type },
  });
  return r.count > 0;
}

export async function deleteHoliday(id: string, schoolId: string) {
  const r = await prisma.holiday.deleteMany({ where: { id, schoolId } });
  return r.count > 0;
}
