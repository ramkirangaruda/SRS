// Tutorials for the parent's children's classes (or class-agnostic ones).
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { parentTutorials } from "@/lib/elearning";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const categoryId = new URL(request.url).searchParams.get("categoryId") ?? undefined;
  return NextResponse.json({ data: await parentTutorials(auth.id, auth.schoolId, categoryId) });
}
