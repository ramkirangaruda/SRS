// PARENT view: GET this parent's children's tuition enrollments + fee status.
// Scoped by parentId AND schoolId so a parent only sees their own children.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listParentTuitions } from "@/lib/tuitions";

export async function GET() {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const tuitions = await listParentTuitions(auth.id, auth.schoolId);
  return NextResponse.json({ tuitions });
}
