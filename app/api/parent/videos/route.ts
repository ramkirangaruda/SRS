// GET — videos targeted to ALL or the parent's children's classes.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { listVideos } from "@/lib/videos";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const classIds = (await prisma.student.findMany({ where: { parentId: auth.id, schoolId: auth.schoolId }, select: { classId: true } })).map((c) => c.classId);
  const sp = new URL(request.url).searchParams;
  return NextResponse.json(await listVideos({ schoolId: auth.schoolId, search: sp.get("search") ?? undefined, category: sp.get("category") ?? undefined, sort: sp.get("sort") ?? undefined, page: Number(sp.get("page") ?? 1), classIds }));
}
