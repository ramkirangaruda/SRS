// GET (list sent broadcasts, cursor) + POST (create + send). PRINCIPAL only.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listBroadcasts, createBroadcast } from "@/lib/broadcast";
import { broadcastCreateSchema } from "@/lib/validations/broadcast";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const result = await listBroadcasts(auth.schoolId, searchParams.get("cursor") ?? undefined);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = broadcastCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const result = await createBroadcast(parsed.data, auth.schoolId, auth.id);
  return NextResponse.json(result, { status: 201 });
}
