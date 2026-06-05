// GET — albums list for parents (same data, read-only). Album detail reuses
// /api/gallery/[albumId] (its GET allows parents).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { listAlbums } from "@/lib/gallery";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const sort = (new URL(request.url).searchParams.get("sort") as "newest" | "oldest" | "photos") || "newest";
  return NextResponse.json({ data: await listAlbums(auth.schoolId, sort) });
}
