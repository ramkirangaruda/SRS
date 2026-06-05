// Single diary entry: GET, PUT, DELETE. Edit/delete restricted to author or
// principal (enforced in lib/diary). PRINCIPAL or TEACHER may read.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getDiaryById, updateDiary, deleteDiary } from "@/lib/diary";
import { diaryUpdateSchema } from "@/lib/validations/diary";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const entry = await getDiaryById(params.id, auth.schoolId);
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = diaryUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const result = await updateDiary(params.id, parsed.data, auth.schoolId, { id: auth.id, role: auth.role });
  if (result.error === "not_found") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result.error === "forbidden") return NextResponse.json({ error: "Only the author or principal can edit this" }, { status: 403 });
  return NextResponse.json(result.item);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  const result = await deleteDiary(params.id, auth.schoolId, { id: auth.id, role: auth.role });
  if (result.error === "not_found") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result.error === "forbidden") return NextResponse.json({ error: "Only the author or principal can delete this" }, { status: 403 });
  return NextResponse.json({ success: true });
}
