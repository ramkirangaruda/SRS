// GET — compare two tests for a class/subject (side-by-side + improvement).
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { compareTests } from "@/lib/test-reports";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const sp = new URL(request.url).searchParams;
  const classId = sp.get("classId"), subjectId = sp.get("subjectId"), testName1 = sp.get("testName1"), testName2 = sp.get("testName2");
  if (!classId || !subjectId || !testName1 || !testName2) return NextResponse.json({ error: "classId, subjectId, testName1, testName2 required" }, { status: 400 });
  return NextResponse.json(await compareTests({ schoolId: auth.schoolId, classId, subjectId, testName1, testName2 }));
}
