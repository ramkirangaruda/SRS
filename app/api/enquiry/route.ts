// Enquiry: GET (list or groupBy=status for Kanban) + POST (create in NEW). PRINCIPAL.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listEnquiries, listEnquiriesGrouped, createEnquiry } from "@/lib/enquiry";
import { enquiryCreateSchema } from "@/lib/validations/enquiry";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  if (searchParams.get("groupBy") === "status") {
    return NextResponse.json({ grouped: await listEnquiriesGrouped(auth.schoolId) });
  }
  const result = await listEnquiries(auth.schoolId, {
    status: searchParams.get("status") ?? undefined,
    categoryId: searchParams.get("categoryId") ?? undefined,
    source: searchParams.get("source") ?? undefined,
    classInterestedIn: searchParams.get("classInterestedIn") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: Number(searchParams.get("page") ?? 1),
  });
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = enquiryCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const enquiry = await createEnquiry(parsed.data, auth.schoolId, auth.id);
  return NextResponse.json(enquiry, { status: 201 });
}
