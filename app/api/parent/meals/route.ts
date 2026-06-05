// GET — meals for a month, by type. The parent UI only requests DAYCARE if their
// child is enrolled (it hides the tab otherwise); meals themselves are school-wide.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listMealsForMonth } from "@/lib/meals";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const now = new Date();
  const year = Number(searchParams.get("year")) || now.getUTCFullYear();
  const month = Number(searchParams.get("month")) || now.getUTCMonth() + 1;
  const type = searchParams.get("type") === "DAYCARE" ? "DAYCARE" : "SCHOOL";
  return NextResponse.json({ data: await listMealsForMonth(auth.schoolId, year, month, type) });
}
