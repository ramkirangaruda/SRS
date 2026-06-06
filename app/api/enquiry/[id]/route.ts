// Single enquiry: GET (with timeline) + PUT (edit) + DELETE (NEW/CLOSED only).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getEnquiry, updateEnquiry, deleteEnquiry } from "@/lib/enquiry";
import { enquiryCreateSchema } from "@/lib/validations/enquiry";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const e = await getEnquiry(params.id, auth.schoolId);
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(e);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = enquiryCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const e = await updateEnquiry(params.id, parsed.data, auth.schoolId);
  if (!e) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(e);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const result = await deleteEnquiry(params.id, auth.schoolId);
  if (result === "notfound") return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result === "forbidden") return NextResponse.json({ error: "Only NEW or CLOSED enquiries can be deleted" }, { status: 409 });
  return NextResponse.json({ ok: true });
}
