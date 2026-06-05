// POST — bulk-create holidays from parsed CSV rows, in ONE transaction.
// Principal only. (The browser parses the CSV; we receive a clean array.)
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { bulkCreateHolidays, HOLIDAY_TYPES } from "@/lib/holidays";
import { holidayBulkSchema } from "@/lib/validations/holiday";

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = holidayBulkSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed" }, { status: 422 });

  // Normalize types to a known value (default OTHER).
  const rows = parsed.data.rows.map((r) => ({
    name: r.name.trim(),
    date: r.date.trim(),
    type: (HOLIDAY_TYPES as readonly string[]).includes(r.type.trim().toUpperCase()) ? r.type.trim().toUpperCase() : "OTHER",
  }));
  try {
    const created = await bulkCreateHolidays(auth.schoolId, rows);
    return NextResponse.json({ count: created.length }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Some rows were invalid (check date format YYYY-MM-DD)." }, { status: 422 });
  }
}
