// Copy one section's timetable to another section of the same class. PRINCIPAL.
// POST /api/timetable/copy
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { copyToSection } from "@/lib/timetable";
import { copySchema } from "@/lib/validations/timetable";

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = copySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  if (parsed.data.fromSectionId === parsed.data.toSectionId) {
    return NextResponse.json({ error: "Source and target sections must differ" }, { status: 400 });
  }

  const count = await copyToSection({ schoolId: auth.schoolId, ...parsed.data });
  return NextResponse.json({ copied: count });
}
