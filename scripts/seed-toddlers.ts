// One-off, idempotent: add a few demo toddlers to each school that has none yet,
// linking two of them to the existing seeded parent accounts. Safe to re-run.
// Run: npx tsx scripts/seed-toddlers.ts
import { prisma } from "../lib/prisma";

async function main() {
  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  for (const s of schools) {
    const existing = await prisma.toddler.count({ where: { schoolId: s.id } });
    if (existing > 0) {
      console.log(`skip "${s.name}" — already has ${existing} toddler(s)`);
      continue;
    }
    const parent = await prisma.user.findFirst({ where: { schoolId: s.id, email: "parent@school.edu" }, select: { id: true } });
    const parent2 = await prisma.user.findFirst({ where: { schoolId: s.id, email: "parent2@school.edu" }, select: { id: true } });
    await prisma.toddler.createMany({
      data: [
        { name: "Aarav", dateOfBirth: new Date("2023-02-10"), gender: "MALE", guardianName: "Priya Parent", guardianPhone: "9000000001", allergies: "Peanuts", parentId: parent?.id ?? null, schoolId: s.id },
        { name: "Diya", dateOfBirth: new Date("2023-09-18"), gender: "FEMALE", guardianName: "Sam Guardian", guardianPhone: "9000000002", schoolId: s.id },
        { name: "Kabir", dateOfBirth: new Date("2022-12-01"), gender: "MALE", guardianName: "Ravi Guardian", guardianPhone: "9000000003", parentId: parent2?.id ?? null, schoolId: s.id },
      ],
    });
    console.log(`added 3 toddlers to "${s.name}"`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
