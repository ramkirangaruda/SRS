// Collection endpoint: GET (list) + POST (create). PRINCIPAL or TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listHomework, createHomework, type HomeworkStatus } from "@/lib/homework";
import { homeworkCreateSchema } from "@/lib/validations/homework";

const STATUSES = ["ACTIVE", "ARCHIVED"];

// GET /api/homework?status=&classId=&sectionId=&subjectId=&search=&page=
export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(request.url);
  const statusRaw = searchParams.get("status") ?? "ACTIVE";
  const status = (STATUSES.includes(statusRaw) ? statusRaw : "ACTIVE") as HomeworkStatus;

  const result = await listHomework({
    schoolId: auth.schoolId,
    status,
    classId: searchParams.get("classId") ?? undefined,
    sectionId: searchParams.get("sectionId") ?? undefined,
    subjectId: searchParams.get("subjectId") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
  });
  return NextResponse.json(result);
}

// POST /api/homework — body already holds the uploaded attachment URLs (the
// files were uploaded separately to /api/upload first).
export async function POST(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = homeworkCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }

  // (notifyParents is accepted here; wiring it to real web-push — service worker
  // subscriptions + a push service — is a later enhancement, so it's a no-op now.)
  const homework = await createHomework(parsed.data, auth.schoolId, auth.id);
  return NextResponse.json(homework, { status: 201 });
}
