// GET — aggregate test scores + attendance for a class/section into preview rows
// (Step 3). No DB writes. PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { generatePreview } from "@/lib/progress-reports";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const sp = new URL(request.url).searchParams;
  const classId = sp.get("classId"), sectionId = sp.get("sectionId");
  if (!classId || !sectionId) return NextResponse.json({ error: "classId and sectionId required" }, { status: 400 });
  return NextResponse.json({ data: await generatePreview(auth.schoolId, classId, sectionId) });
}
