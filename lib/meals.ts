// Meals data layer. WHY A JSON COLUMN: a day's menu is { breakfast, lunch, snack }
// where each is a list of items. We store that whole object as JSON in one
// `menu` column rather than a row per item or per meal. JSON is the right choice
// HERE because the menu is always read/written as a single unit, we never query
// "all days that served rice," and the shape may vary. The rule of thumb: use a
// JSON column for self-contained, non-relational blobs you treat atomically; use
// separate tables when you need to query/join/aggregate the inner fields.
import { prisma } from "@/lib/prisma";
import { dayKey, dateUTCFromKey, parseKey, todayKey } from "@/lib/calendar";

export type MealMenu = { breakfast: string[]; lunch: string[]; snack: string[] };
export const EMPTY_MENU: MealMenu = { breakfast: [], lunch: [], snack: [] };

export function parseMenu(json: string | null | undefined): MealMenu {
  if (!json) return { ...EMPTY_MENU };
  try {
    const m = JSON.parse(json);
    return { breakfast: m.breakfast ?? [], lunch: m.lunch ?? [], snack: m.snack ?? [] };
  } catch {
    return { ...EMPTY_MENU };
  }
}
function isEmptyMenu(m: MealMenu) {
  return m.breakfast.length === 0 && m.lunch.length === 0 && m.snack.length === 0;
}

// Monday-of-the-week key for any key (weeks run Mon..Sat in the planner).
export function mondayKeyOf(key: string): string {
  const { y, m, d } = parseKey(key);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun..6=Sat
  const offset = wd === 0 ? -6 : 1 - wd;
  return dayKey(new Date(Date.UTC(y, m - 1, d + offset)));
}
function weekKeys(mondayKey: string, count = 6): string[] {
  const { y, m, d } = parseKey(mondayKey);
  return Array.from({ length: count }, (_, i) => dayKey(new Date(Date.UTC(y, m - 1, d + i))));
}

export type DayMeal = { id?: string; date: string; menu: MealMenu };

// Meals for a month (for the calendar). Returns one entry per planned day.
export async function listMealsForMonth(schoolId: string, year: number, month: number, type: string): Promise<DayMeal[]> {
  const startKey = dayKey(new Date(Date.UTC(year, month - 1, 1)));
  const endKey = dayKey(new Date(Date.UTC(year, month, 0)));
  const rows = await prisma.mealCalendar.findMany({
    where: { schoolId, type, date: { gte: dateUTCFromKey(startKey), lte: dateUTCFromKey(endKey) } },
  });
  return rows.map((r) => ({ id: r.id, date: r.date.toISOString(), menu: parseMenu(r.menu) }));
}

// A whole week (Mon..Sat) for the planner — always 6 entries, empty where unplanned.
export async function getWeek(schoolId: string, anyKeyInWeek: string, type: string) {
  const monday = mondayKeyOf(anyKeyInWeek);
  const keys = weekKeys(monday);
  const rows = await prisma.mealCalendar.findMany({
    where: { schoolId, type, date: { gte: dateUTCFromKey(keys[0]), lte: dateUTCFromKey(keys[keys.length - 1]) } },
  });
  const byKey = new Map(rows.map((r) => [dayKey(r.date), parseMenu(r.menu)]));
  return { monday, days: keys.map((k) => ({ date: k, menu: byKey.get(k) ?? { ...EMPTY_MENU } })) };
}

// SAVE THE WHOLE WEEK in ONE transaction — not cell-by-cell. The planner sends
// all 6 days at once; we upsert each (insert or update on the unique
// [school,date,type]) and delete days emptied out. One round trip, atomic.
export async function saveWeek(schoolId: string, type: string, days: { date: string; menu: MealMenu }[]) {
  await prisma.$transaction(
    days.map((d) => {
      const dateVal = dateUTCFromKey(d.date);
      if (isEmptyMenu(d.menu)) {
        return prisma.mealCalendar.deleteMany({ where: { schoolId, type, date: dateVal } });
      }
      return prisma.mealCalendar.upsert({
        where: { schoolId_date_type: { schoolId, date: dateVal, type } },
        create: { schoolId, type, date: dateVal, menu: JSON.stringify(d.menu) },
        update: { menu: JSON.stringify(d.menu) },
      });
    })
  );
  return { count: days.length };
}

// CLONE a week: read the source week's plans and write them to the target week,
// shifting each date by the week delta. This is how "copy previous week" turns a
// full week of data entry into one click.
export async function copyWeek(schoolId: string, fromKey: string, toKey: string, type: string) {
  const fromMon = mondayKeyOf(fromKey);
  const toMon = mondayKeyOf(toKey);
  const { days } = await getWeek(schoolId, fromMon, type);
  const fromKeys = weekKeys(fromMon);
  const toKeys = weekKeys(toMon);
  const shifted = days.map((d, i) => ({ date: toKeys[i], menu: d.menu })); // same index = same weekday
  void fromKeys;
  return saveWeek(schoolId, type, shifted);
}

export async function deleteDayMeal(id: string, schoolId: string) {
  const r = await prisma.mealCalendar.deleteMany({ where: { id, schoolId } });
  return r.count > 0;
}

// Today's menu (for the "Today's Menu" widget/card).
export async function todayMenu(schoolId: string, type: string): Promise<MealMenu | null> {
  const row = await prisma.mealCalendar.findFirst({ where: { schoolId, type, date: dateUTCFromKey(todayKey()) } });
  return row ? parseMenu(row.menu) : null;
}

// Days in the current week (Mon..Sat) with NO school meal planned — for the
// principal dashboard warning.
export async function unplannedDaysThisWeek(schoolId: string): Promise<string[]> {
  const monday = mondayKeyOf(todayKey());
  const keys = weekKeys(monday);
  const rows = await prisma.mealCalendar.findMany({
    where: { schoolId, type: "SCHOOL", date: { gte: dateUTCFromKey(keys[0]), lte: dateUTCFromKey(keys[keys.length - 1]) } },
    select: { date: true },
  });
  const planned = new Set(rows.map((r) => dayKey(r.date)));
  return keys.filter((k) => !planned.has(k));
}
