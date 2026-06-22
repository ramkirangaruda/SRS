// One-off backfill: give every existing school a "Branch 1" (default) and
// "Branch 2". Idempotent — schools that already have branches are skipped, so this
// is safe to run more than once. Run with: npx tsx scripts/backfill-branches.ts
//
// Both branches start with ALL current modules enabled, so switching a branch
// changes nothing until the principal customises it in Settings → Branches. The
// new Toddlers/Tuitions modules get added to the right branches as they're built.
import { prisma } from "../lib/prisma";
import { TOGGLEABLE_MODULES, serializeModules } from "../lib/modules";

async function main() {
  const allModules = serializeModules(TOGGLEABLE_MODULES.map((m) => m.key));
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, _count: { select: { branches: true } } },
  });

  for (const s of schools) {
    if (s._count.branches > 0) {
      console.log(`skip "${s.name}" — already has ${s._count.branches} branch(es)`);
      continue;
    }
    await prisma.branch.create({
      data: { name: "Branch 1", schoolId: s.id, isDefault: true, sortOrder: 0, enabledModules: allModules },
    });
    await prisma.branch.create({
      data: { name: "Branch 2", schoolId: s.id, isDefault: false, sortOrder: 1, enabledModules: allModules },
    });
    console.log(`created Branch 1 + Branch 2 for "${s.name}"`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
