// Seed script — populates the empty database with demo data so you can log in
// and explore immediately. Run with `npm run db:seed`.
//
// We HASH passwords here with bcrypt, exactly like a real signup would, so the
// stored data matches what authorize() expects to compare against.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLES } from "../lib/roles";

const prisma = new PrismaClient();

async function main() {
  // The "10" is the bcrypt "cost factor" (2^10 rounds) — strong but fast enough.
  const passwordHash = await bcrypt.hash("password123", 10);

  // upsert = update if it exists, otherwise create. This makes the seed safe to
  // run repeatedly without creating duplicates or erroring on the unique email.
  const principal = await prisma.user.upsert({
    where: { email: "principal@school.edu" },
    update: {},
    create: {
      email: "principal@school.edu",
      name: "Dr. Ada Principal",
      passwordHash,
      role: ROLES.PRINCIPAL,
    },
  });

  const parent = await prisma.user.upsert({
    where: { email: "parent@school.edu" },
    update: {},
    create: {
      email: "parent@school.edu",
      name: "Sam Parent",
      passwordHash,
      role: ROLES.PARENT,
    },
  });

  // Give the parent two children so their dashboard isn't empty. We clear any
  // existing children for this parent first to keep re-runs idempotent.
  await prisma.student.deleteMany({ where: { parentId: parent.id } });
  await prisma.student.createMany({
    data: [
      { name: "Mia Parent", grade: "Grade 3", parentId: parent.id },
      { name: "Leo Parent", grade: "Grade 5", parentId: parent.id },
    ],
  });

  console.log("Seed complete:");
  console.log(`  Principal -> ${principal.email} / password123`);
  console.log(`  Parent    -> ${parent.email} / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1); // Non-zero exit tells the shell the seed failed.
  })
  .finally(async () => {
    // Always close the DB connection so the script doesn't hang.
    await prisma.$disconnect();
  });
