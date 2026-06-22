// Server-only branch helpers: list a school's branches and resolve the "current"
// branch from the cookie. SERVER-ONLY because it touches next/headers (cookies)
// and Prisma — never import this from a Client Component (import lib/modules.ts
// instead for the client-safe pieces). Mirrors the i18n split (request.ts vs
// locales.ts).
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { parseModules, type ModuleKey } from "@/lib/modules";

// The cookie that remembers which branch the principal is working in. It only
// affects which nav modules are shown (data is shared across branches), so a
// plain readable cookie is fine — there's nothing sensitive to protect here.
export const BRANCH_COOKIE = "branchId";

export type BranchSummary = {
  id: string;
  name: string;
  enabledModules: ModuleKey[];
  isDefault: boolean;
  sortOrder: number;
};

// All branches for a school, ordered for the switcher. enabledModules is parsed
// from its stored JSON string into a typed array here, once.
export async function listBranches(schoolId: string): Promise<BranchSummary[]> {
  const rows = await prisma.branch.findMany({
    where: { schoolId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, name: true, enabledModules: true, isDefault: true, sortOrder: true },
  });
  return rows.map((b) => ({
    id: b.id,
    name: b.name,
    enabledModules: parseModules(b.enabledModules),
    isDefault: b.isDefault,
    sortOrder: b.sortOrder,
  }));
}

// The branch the principal currently has selected. Falls back gracefully: the
// cookie's branch if it still exists → the school's default branch → the first
// branch → null (school has no branches configured yet).
export async function getCurrentBranch(schoolId: string): Promise<BranchSummary | null> {
  const branches = await listBranches(schoolId);
  if (branches.length === 0) return null;
  const cookieId = cookies().get(BRANCH_COOKIE)?.value;
  return (
    branches.find((b) => b.id === cookieId) ??
    branches.find((b) => b.isDefault) ??
    branches[0]
  );
}
