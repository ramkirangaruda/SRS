// GET (cursor-paginated feed) + POST (create). PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listDiary, createDiary } from "@/lib/diary";
import { diaryCreateSchema } from "@/lib/validations/diary";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const result = await listDiary({
    schoolId: auth.schoolId,
    classId: searchParams.get("classId") ?? undefined,
    sectionId: searchParams.get("sectionId") ?? undefined,
    authorId: searchParams.get("authorId") ?? undefined,
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = diaryCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const entry = await createDiary(parsed.data, auth.schoolId, auth.id);
  return NextResponse.json(entry, { status: 201 });
}
