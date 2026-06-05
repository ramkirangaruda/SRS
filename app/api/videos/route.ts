// GET (list, paginated, search/category) + POST (create). Read any authed; write principal.
import { NextResponse } from "next/server";
import { requireRole, requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listVideos, createVideo } from "@/lib/videos";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  const sp = new URL(request.url).searchParams;
  return NextResponse.json(await listVideos({ schoolId: auth.schoolId, search: sp.get("search") ?? undefined, category: sp.get("category") ?? undefined, sort: sp.get("sort") ?? undefined, page: Number(sp.get("page") ?? 1) }));
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  if (!body.title || !body.videoUrl) return NextResponse.json({ error: "Title and video are required" }, { status: 422 });
  const v = await createVideo(auth.schoolId, auth.id, body);
  return NextResponse.json({ id: v.id }, { status: 201 });
}
