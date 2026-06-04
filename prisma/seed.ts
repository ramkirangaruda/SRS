// Seed script — populates the database with demo data so we can build Phase 3
// against real records. Run with `npm run db:seed`.
//
// It is IDEMPOTENT: we clear the tables we seed (in child→parent order to respect
// foreign keys) before recreating them, so running it repeatedly is safe.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLES } from "../lib/roles";

const prisma = new PrismaClient();

async function main() {
  // 1. CLEAN — delete children before parents so no foreign key is left dangling.
  await prisma.feePayment.deleteMany();
  await prisma.feeStructure.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.student.deleteMany();
  await prisma.section.deleteMany();
  await prisma.class.deleteMany();
  await prisma.academicYear.deleteMany();
  await prisma.user.deleteMany();
  await prisma.school.deleteMany();

  // 2. SCHOOL — the tenant root every other record hangs off of.
  const school = await prisma.school.create({
    data: {
      name: "Springfield Public School",
      address: "742 Evergreen Terrace, Springfield",
      phone: "+1-555-0100",
      email: "office@springfield.edu",
      activeAcademicYear: "2025-2026",
    },
  });

  // 3. ACADEMIC YEAR — the active year, referenced by fees and progress reports.
  const academicYear = await prisma.academicYear.create({
    data: {
      name: "2025-2026",
      startDate: new Date("2025-06-01"),
      endDate: new Date("2026-04-30"),
      isActive: true,
      schoolId: school.id,
    },
  });

  // 4. USERS — one of each role. All share the demo password "password123",
  //    stored only as a bcrypt hash (cost factor 10).
  const passwordHash = await bcrypt.hash("password123", 10);

  const principal = await prisma.user.create({
    data: {
      name: "Dr. Ada Principal",
      email: "principal@school.edu",
      password: passwordHash,
      phone: "+1-555-0101",
      role: ROLES.PRINCIPAL,
      schoolId: school.id,
    },
  });

  const teacher = await prisma.user.create({
    data: {
      name: "Mr. Alan Teacher",
      email: "teacher@school.edu",
      password: passwordHash,
      phone: "+1-555-0102",
      role: ROLES.TEACHER,
      schoolId: school.id,
    },
  });

  const parent = await prisma.user.create({
    data: {
      name: "Sam Parent",
      email: "parent@school.edu",
      password: passwordHash,
      phone: "+1-555-0103",
      role: ROLES.PARENT,
      schoolId: school.id,
    },
  });

  // 5. CLASSES — grade levels for this school.
  const class1 = await prisma.class.create({
    data: { name: "1st", schoolId: school.id },
  });
  const class2 = await prisma.class.create({
    data: { name: "2nd", schoolId: school.id },
  });

  // 6. SECTIONS — divisions within 1st grade.
  const sectionA = await prisma.section.create({
    data: { name: "A", classId: class1.id },
  });
  await prisma.section.create({
    data: { name: "B", classId: class1.id },
  });

  // 7. SUBJECTS — offered in 1st grade. createMany is efficient for bulk inserts.
  await prisma.subject.createMany({
    data: [
      { name: "English", classId: class1.id, schoolId: school.id },
      { name: "Mathematics", classId: class1.id, schoolId: school.id },
      { name: "Science", classId: class1.id, schoolId: school.id },
    ],
  });

  // 8. FEE STRUCTURE — what 1st grade owes for the active academic year.
  const feeStructure = await prisma.feeStructure.create({
    data: {
      classId: class1.id,
      academicYearId: academicYear.id,
      totalAmount: 12000,
      description: "Annual tuition for 1st grade (2025-2026)",
      schoolId: school.id,
    },
  });

  // 9. STUDENTS — the parent's two children, enrolled in 1st grade, section A.
  const mia = await prisma.student.create({
    data: {
      name: "Mia Parent",
      admissionNumber: "ADM-2025-001",
      dateOfBirth: new Date("2019-03-15"),
      gender: "FEMALE",
      bloodGroup: "O+",
      classId: class1.id,
      sectionId: sectionA.id,
      parentId: parent.id,
      schoolId: school.id,
    },
  });

  await prisma.student.create({
    data: {
      name: "Leo Parent",
      admissionNumber: "ADM-2025-002",
      dateOfBirth: new Date("2018-09-02"),
      gender: "MALE",
      bloodGroup: "A+",
      classId: class1.id,
      sectionId: sectionA.id,
      parentId: parent.id,
      schoolId: school.id,
    },
  });

  // 10. A sample FEE PAYMENT so the fees module has data to show in Phase 3.
  await prisma.feePayment.create({
    data: {
      studentId: mia.id,
      amount: 6000,
      date: new Date(),
      mode: "ONLINE",
      receiptNumber: "RCPT-2025-0001",
      notes: "First installment",
      collectedById: principal.id,
      schoolId: school.id,
    },
  });

  console.log("Seed complete:");
  console.log(`  School    -> ${school.name}`);
  console.log(`  Principal -> ${principal.email} / password123`);
  console.log(`  Teacher   -> ${teacher.email} / password123`);
  console.log(`  Parent    -> ${parent.email} / password123`);
  console.log(`  Classes   -> ${class1.name}, ${class2.name}`);
  console.log(`  Students  -> Mia & Leo (1st grade, section ${sectionA.name})`);
  console.log(`  Fee       -> $${feeStructure.totalAmount} structure + 1 payment`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
