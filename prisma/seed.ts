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
  // Reports reference student/subject — clear before those.
  await prisma.testReport.deleteMany();
  await prisma.progressReport.deleteMany();
  // Media + e-learning reference class/user — clear before those.
  await prisma.assignmentSubmission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.tutorial.deleteMany();
  await prisma.eLearningCategory.deleteMany();
  await prisma.video.deleteMany();
  await prisma.galleryImage.deleteMany(); // also cascades from album
  await prisma.galleryAlbum.deleteMany();
  // Calendar data references the school only — clear before deleting the school.
  await prisma.event.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.mealCalendar.deleteMany();
  // Communication + homework reference class/user, so clear before those.
  await prisma.feedback.deleteMany(); // cascades FeedbackMessage
  await prisma.broadcastMessage.deleteMany(); // cascades BroadcastRecipient
  await prisma.schoolDiary.deleteMany(); // cascades DiaryRead
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
      showRankToParents: true,
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
      dateOfBirth: new Date("2019-03-15"), gender: "FEMALE", bloodGroup: "O+", isDaycare: true,
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

  // 11. CALENDAR DEMO DATA (events, holidays, meals) — dates relative to today,
  //     stored at UTC midnight so they read the same in any timezone.
  const dayUTC = (offset: number) => {
    const n = new Date();
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + offset));
  };
  await prisma.event.createMany({
    data: [
      { title: "Annual Sports Day", description: "Track & field events.", date: dayUTC(10), type: "SPORTS", schoolId: school.id },
      { title: "Mid-term Exams", description: "All classes.", date: dayUTC(20), endDate: dayUTC(24), type: "EXAM", schoolId: school.id },
      { title: "Parent-Teacher Meeting", description: "Class 1st.", date: dayUTC(5), type: "PTM", schoolId: school.id },
    ],
  });
  await prisma.holiday.createMany({
    data: [
      { name: "Diwali Break", description: "Festival of lights.", date: dayUTC(12), endDate: dayUTC(15), type: "FESTIVAL", schoolId: school.id },
      { name: "Republic Day", date: dayUTC(40), type: "NATIONAL", schoolId: school.id },
    ],
  });
  // A meal plan for today (SCHOOL) so "Today's Menu" widgets show something.
  await prisma.mealCalendar.create({
    data: {
      date: dayUTC(0),
      type: "SCHOOL",
      menu: JSON.stringify({ breakfast: ["Idli", "Sambar", "Chutney"], lunch: ["Rice", "Dal", "Sabzi"], snack: ["Fruit", "Biscuit"] }),
      schoolId: school.id,
    },
  });

  // 12. TEST SCORES demo — Unit Test 1 & 2 for class 1st students, so trends and
  //     report cards have data. percentage + grade are computed at entry.
  const class1Subjects = await prisma.subject.findMany({ where: { classId: class1.id }, select: { id: true, name: true } });
  const gradeFor = (pct: number) => (pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B+" : pct >= 60 ? "B" : pct >= 50 ? "C" : pct >= 40 ? "D" : "F");
  const tr: { studentId: string; subjectId: string; classId: string; sectionId: string; testName: string; date: Date; total: number; obtained: number }[] = [];
  const scoreTable: Record<string, Record<string, [number, number]>> = {
    // student -> subject -> [UT1, UT2] obtained (out of 100)
    [mia.id]: { English: [82, 88], Mathematics: [75, 80], Science: [90, 92] },
    [leo.id]: { English: [60, 55], Mathematics: [48, 62], Science: [70, 68] },
  };
  for (const [sid, subjMarks] of Object.entries(scoreTable)) {
    for (const subj of class1Subjects) {
      const marks = subjMarks[subj.name];
      if (!marks) continue;
      tr.push({ studentId: sid, subjectId: subj.id, classId: class1.id, sectionId: sec1A.id, testName: "Unit Test 1", date: new Date("2025-07-15"), total: 100, obtained: marks[0] });
      tr.push({ studentId: sid, subjectId: subj.id, classId: class1.id, sectionId: sec1A.id, testName: "Unit Test 2", date: new Date("2025-09-15"), total: 100, obtained: marks[1] });
    }
  }
  await prisma.testReport.createMany({
    data: tr.map((t) => ({ studentId: t.studentId, subjectId: t.subjectId, classId: t.classId, sectionId: t.sectionId, testName: t.testName, date: t.date, totalMarks: t.total, obtainedMarks: t.obtained, percentage: (t.obtained / t.total) * 100, grade: gradeFor((t.obtained / t.total) * 100), schoolId: school.id })),
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
