// GET (single, increments view count) + PUT (update) + DELETE.
import { NextResponse } from "next/server";
import { requireRole, requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getVideo, updateVideo, deleteVideo } from "@/lib/videos";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  const v = await getVideo(params.id, auth.schoolId, true); // increment view count on open
  if (!v) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(v);
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  const ok = await updateVideo(params.id, auth.schoolId, body);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const ok = await deleteVideo(params.id, auth.schoolId);
  if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ success: true });
}
