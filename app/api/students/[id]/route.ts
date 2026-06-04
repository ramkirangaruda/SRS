// Single-student endpoint: GET (read), PUT (update), DELETE.
// Path: /api/students/[id]
//
// HOW THE DYNAMIC [id] ROUTE WORKS:
// The folder name `[id]` is a dynamic segment. A request to /api/students/abc123
// matches this file, and Next passes the captured value to the handler as
// `params.id` (= "abc123"). One file therefore serves every student id.
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getStudentById, updateStudent, deleteStudent } from "@/lib/students";
import { studentUpdateSchema } from "@/lib/validations/student";

type RouteContext = { params: { id: string } };

// GET /api/students/:id
export async function GET(_request: Request, { params }: RouteContext) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  const student = await getStudentById(params.id, auth.schoolId);
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  return NextResponse.json(student);
}

// PUT /api/students/:id  — replace the student's editable fields.
export async function PUT(request: Request, { params }: RouteContext) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = studentUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  try {
    const count = await updateStudent(params.id, parsed.data, auth.schoolId);
    if (count === 0) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    // Return the fresh record so the client can update its view.
    const updated = await getStudentById(params.id, auth.schoolId);
    return NextResponse.json(updated);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "That admission number is already in use." },
        { status: 409 }
      );
    }
    console.error("Update student failed:", e);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

// DELETE /api/students/:id
export async function DELETE(_request: Request, { params }: RouteContext) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  const count = await deleteStudent(params.id, auth.schoolId);
  if (count === 0) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
