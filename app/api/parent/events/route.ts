// GET — events for a month targeted to ALL or the parent's children's classes.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listParentEventsForMonth } from "@/lib/events";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getUTCFullYear();
  const month = Number(searchParams.get("month")) || now.getUTCMonth() + 1;
  const type = searchParams.get("type") || undefined;
  const data = await listParentEventsForMonth(auth.id, auth.schoolId, year, month, type);
  return NextResponse.json({ data });
}
