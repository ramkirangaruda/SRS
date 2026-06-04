// Seed script — populates the database with demo data so we can build against
// real records. Run with `npm run db:seed`.
//
// It is IDEMPOTENT: we clear the tables we seed (in child→parent order to respect
// foreign keys) before recreating them, so running it repeatedly is safe.
//
// NOTE: all money is stored in paise (integer minor units) via toMinor(). See
// lib/money.ts for why.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { ROLES } from "../lib/roles";
import { toMinor } from "../lib/money";

const prisma = new PrismaClient();

async function main() {
  // 1. CLEAN — delete children before parents so no foreign key is left dangling.
  // Homework references class/subject/user, so clear it before those.
  await prisma.homework.deleteMany();
  await prisma.attendance.deleteMany();
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
      phone: "+91-555-0100",
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

  // 4. USERS — roles share the demo password "password123" (bcrypt, cost 10).
  const passwordHash = await bcrypt.hash("password123", 10);

  const principal = await prisma.user.create({
    data: {
      name: "Dr. Ada Principal",
      email: "principal@school.edu",
      password: passwordHash,
      phone: "+91-555-0101",
      role: ROLES.PRINCIPAL,
      schoolId: school.id,
    },
  });

  const teacher = await prisma.user.create({
    data: {
      name: "Mr. Alan Teacher",
      email: "teacher@school.edu",
      password: passwordHash,
      phone: "+91-555-0102",
      role: ROLES.TEACHER,
      schoolId: school.id,
    },
  });

  const parent = await prisma.user.create({
    data: {
      name: "Sam Parent",
      email: "parent@school.edu",
      password: passwordHash,
      phone: "+91-555-0103",
      role: ROLES.PARENT,
      schoolId: school.id,
    },
  });

  const parent2 = await prisma.user.create({
    data: {
      name: "Pat Guardian",
      email: "parent2@school.edu",
      password: passwordHash,
      phone: "+91-555-0104",
      role: ROLES.PARENT,
      schoolId: school.id,
    },
  });

  // 5. CLASSES.
  const class1 = await prisma.class.create({ data: { name: "1st", schoolId: school.id } });
  const class2 = await prisma.class.create({ data: { name: "2nd", schoolId: school.id } });

  // 6. SECTIONS.
  const sec1A = await prisma.section.create({ data: { name: "A", classId: class1.id } });
  await prisma.section.create({ data: { name: "B", classId: class1.id } });
  const sec2A = await prisma.section.create({ data: { name: "A", classId: class2.id } });

  // 7. SUBJECTS (1st grade).
  await prisma.subject.createMany({
    data: [
      { name: "English", classId: class1.id, schoolId: school.id },
      { name: "Mathematics", classId: class1.id, schoolId: school.id },
      { name: "Science", classId: class1.id, schoolId: school.id },
    ],
  });

  // 8. FEE STRUCTURES — annual tuition per class for the active year (in paise).
  const fee1 = await prisma.feeStructure.create({
    data: {
      classId: class1.id,
      academicYearId: academicYear.id,
      totalAmount: toMinor(12000), // ₹12,000.00
      description: "Annual tuition for 1st grade (2025-2026)",
      schoolId: school.id,
    },
  });
  await prisma.feeStructure.create({
    data: {
      classId: class2.id,
      academicYearId: academicYear.id,
      totalAmount: toMinor(15000), // ₹15,000.00
      description: "Annual tuition for 2nd grade (2025-2026)",
      schoolId: school.id,
    },
  });

  // 9. STUDENTS.
  const mia = await prisma.student.create({
    data: {
      name: "Mia Parent", admissionNumber: "ADM-2025-001",
      dateOfBirth: new Date("2019-03-15"), gender: "FEMALE", bloodGroup: "O+",
      classId: class1.id, sectionId: sec1A.id, parentId: parent.id, schoolId: school.id,
    },
  });
  const leo = await prisma.student.create({
    data: {
      name: "Leo Parent", admissionNumber: "ADM-2025-002",
      dateOfBirth: new Date("2018-09-02"), gender: "MALE", bloodGroup: "A+",
      classId: class1.id, sectionId: sec1A.id, parentId: parent.id, schoolId: school.id,
    },
  });
  const ravi = await prisma.student.create({
    data: {
      name: "Ravi Guardian", admissionNumber: "ADM-2025-003",
      dateOfBirth: new Date("2017-07-21"), gender: "MALE", bloodGroup: "B+",
      classId: class2.id, sectionId: sec2A.id, parentId: parent2.id, schoolId: school.id,
    },
  });
  const anya = await prisma.student.create({
    data: {
      name: "Anya Guardian", admissionNumber: "ADM-2025-004",
      dateOfBirth: new Date("2017-11-05"), gender: "FEMALE", bloodGroup: "AB+",
      classId: class2.id, sectionId: sec2A.id, parentId: parent2.id, schoolId: school.id,
    },
  });

  // 10. FEE PAYMENTS — varied so the dashboard shows PAID / PARTIAL / UNPAID.
  //   Mia: ₹6,000 of ₹12,000   -> PARTIAL
  //   Leo: nothing             -> UNPAID
  //   Ravi: ₹15,000 of ₹15,000 -> PAID
  //   Anya: ₹5,000 of ₹15,000  -> PARTIAL
  await prisma.feePayment.createMany({
    data: [
      { studentId: mia.id, amount: toMinor(6000), date: new Date("2025-06-10"), mode: "ONLINE", receiptNumber: "RCPT-2025-0001", notes: "First installment", collectedById: principal.id, schoolId: school.id },
      { studentId: ravi.id, amount: toMinor(15000), date: new Date("2025-06-12"), mode: "UPI", receiptNumber: "RCPT-2025-0002", notes: "Full payment", collectedById: principal.id, schoolId: school.id },
      { studentId: anya.id, amount: toMinor(5000), date: new Date("2025-06-15"), mode: "CASH", receiptNumber: "RCPT-2025-0003", notes: "Partial", collectedById: principal.id, schoolId: school.id },
    ],
  });

  console.log("Seed complete:");
  console.log(`  School    -> ${school.name}`);
  console.log(`  Principal -> ${principal.email} / password123`);
  console.log(`  Teacher   -> ${teacher.email} / password123`);
  console.log(`  Parents   -> ${parent.email}, ${parent2.email} / password123`);
  console.log(`  Classes   -> 1st (₹12,000), 2nd (₹15,000)`);
  console.log(`  Students  -> Mia(PARTIAL), Leo(UNPAID), Ravi(PAID), Anya(PARTIAL)`);
  console.log(`  Fee fee1 id ${fee1.id}, leo ${leo.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
