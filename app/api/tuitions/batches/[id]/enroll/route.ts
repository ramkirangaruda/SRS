// Enroll a student into a batch. POST { studentId }. PRINCIPAL + TEACHER.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { enrollStudent } from "@/lib/tuitions";
import { enrollSchema } from "@/lib/validations/tuition";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const result = await enrollStudent(params.id, parsed.data.studentId, auth.schoolId);
  if (result === "notfound") return NextResponse.json({ error: "Batch or student not found" }, { status: 404 });
  if (result === "already") return NextResponse.json({ error: "Already enrolled" }, { status: 409 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
