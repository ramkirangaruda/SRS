// POST /api/branches/select — remember which branch the principal is working in.
// PRINCIPAL only (branches are a principal-facing concept). We verify the branch
// belongs to the caller's school before trusting it, then store its id in the
// BRANCH_COOKIE. The cookie is httpOnly: only the server needs it (to filter the
// nav); the client already gets the current branch as a prop.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { BRANCH_COOKIE } from "@/lib/branches";

export async function POST(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;

  let body: { branchId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const branchId = body.branchId;
  if (!branchId || typeof branchId !== "string") {
    return NextResponse.json({ error: "branchId is required" }, { status: 400 });
  }

  // Ownership check — never let a principal select another school's branch.
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, schoolId: auth.schoolId },
    select: { id: true },
  });
  if (!branch) {
    return NextResponse.json({ error: "Branch not found" }, { status: 404 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(BRANCH_COOKIE, branchId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return res;
}
