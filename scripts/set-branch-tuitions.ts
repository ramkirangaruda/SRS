// One-off: make existing branches match the intended setup — Branch 2 (the
// non-default branch) runs Tuitions; the default branch (Branch 1) does not.
// Idempotent. Run: npx tsx scripts/set-branch-tuitions.ts
import { prisma } from "../lib/prisma";
import { parseModules, serializeModules } from "../lib/modules";

async function main() {
  const branches = await prisma.branch.findMany({ select: { id: true, name: true, isDefault: true, enabledModules: true } });
  for (const b of branches) {
    const mods = parseModules(b.enabledModules);
    const has = mods.includes("tuitions");
    // Default branch (Branch 1): no tuitions. Others (Branch 2): include tuitions.
    const want = !b.isDefault;
    if (has === want) {
      console.log(`skip "${b.name}" — already ${want ? "has" : "no"} tuitions`);
      continue;
    }
    const next = want ? [...mods, "tuitions" as const] : mods.filter((m) => m !== "tuitions");
    await prisma.branch.update({ where: { id: b.id }, data: { enabledModules: serializeModules(next) } });
    console.log(`"${b.name}" -> ${want ? "added" : "removed"} tuitions`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
