// GET — cursor-paginated diary feed for the parent's children's classes only.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getParentDiary } from "@/lib/diary";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const result = await getParentDiary({
    parentId: auth.id,
    schoolId: auth.schoolId,
    childId: searchParams.get("childId") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
  });
  return NextResponse.json(result);
}
