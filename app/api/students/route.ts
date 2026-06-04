// Collection endpoint for students: GET (list) and POST (create).
// Path: /api/students
//
// Both methods are PRINCIPAL-only. We enforce that with requireRole() at the top
// of each handler — the auth trust boundary discussed in lib/api-auth.ts.
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listStudents, createStudent } from "@/lib/students";
import { studentCreateSchema } from "@/lib/validations/student";

// GET /api/students?search=&classId=&sectionId=&page=&pageSize=
export async function GET(request: Request) {
  // 1. AUTH: must be a logged-in principal.
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  // 2. Read query params from the URL.
  const { searchParams } = new URL(request.url);
  const result = await listStudents({
    schoolId: auth.schoolId, // scope to THIS principal's school
    search: searchParams.get("search") ?? undefined,
    classId: searchParams.get("classId") ?? undefined,
    sectionId: searchParams.get("sectionId") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
    pageSize: Number(searchParams.get("pageSize") ?? 10),
  });

  // 3. Respond with JSON (data + pagination metadata).
  return NextResponse.json(result);
}

// POST /api/students  — body is the student (+ parent) form data.
export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  // Parse + validate the body with the SAME zod schema the form uses. Never
  // trust the client — this is the real gate.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = studentCreateSchema.safeParse(body);
  if (!parsed.success) {
    // flatten() gives a tidy { fieldErrors } object the form can display.
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const student = await createStudent(parsed.data, auth.schoolId);
    return NextResponse.json(student, { status: 201 }); // 201 = Created
  } catch (e) {
    // P2002 = unique constraint violation (duplicate admissionNumber or email).
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const field = (e.meta?.target as string[] | undefined)?.join(", ") ?? "value";
      return NextResponse.json(
        { error: `A record with that ${field} already exists.` },
        { status: 409 } // 409 = Conflict
      );
    }
    console.error("Create student failed:", e);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}
