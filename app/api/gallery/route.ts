// GET (albums list, any authed) + POST (create album, principal).
import { NextResponse } from "next/server";
import { requireRole, requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listAlbums, createAlbum } from "@/lib/gallery";

export async function GET(request: Request) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER, ROLES.PARENT]);
  if (auth instanceof NextResponse) return auth;
  const sort = (new URL(request.url).searchParams.get("sort") as "newest" | "oldest" | "photos") || "newest";
  return NextResponse.json({ data: await listAlbums(auth.schoolId, sort) });
}

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  if (!body.title) return NextResponse.json({ error: "Title is required" }, { status: 422 });
  const album = await createAlbum(auth.schoolId, body);
  return NextResponse.json({ id: album.id }, { status: 201 });
}
