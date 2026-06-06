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
  // Phase 13: daycare (child tables cascade from log), meeting room, planners.
  await prisma.daycareActivity.deleteMany();
  await prisma.daycareMeal.deleteMany();
  await prisma.daycareNap.deleteMany();
  await prisma.daycareLog.deleteMany();
  await prisma.meetingMessage.deleteMany();
  await prisma.meetingGroupMember.deleteMany();
  await prisma.meetingGroup.deleteMany();
  await prisma.planner.deleteMany();
  await prisma.resource.deleteMany();
  // Phase 14: visitors, enquiry, admissions. Enquiry<->AdmissionQuery reference
  // each other (circular FK), so null the cross-links before deleting either.
  await prisma.enquiry.updateMany({ data: { convertedToAdmissionId: null } });
  await prisma.admissionQuery.updateMany({ data: { enquiryId: null } });
  await prisma.enquiryActivity.deleteMany();
  await prisma.admissionActivity.deleteMany();
  await prisma.enquiry.deleteMany();
  await prisma.admissionQuery.deleteMany();
  await prisma.enquiryCategory.deleteMany();
  await prisma.visitorRegister.deleteMany();
  // Phase 12: timetable + virtual classroom + staff reference class/user/year.
  await prisma.timetableEntry.deleteMany();
  await prisma.periodTemplate.deleteMany();
  await prisma.virtualClassroom.deleteMany();
  await prisma.staffMember.deleteMany();
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

  // 13. STAFF — make the demo teacher a StaffMember, and add two more teachers
  //     (one will be used to demonstrate a timetable conflict). Each teacher is a
  //     User(TEACHER) + a StaffMember row, mirroring how the add-staff form works.
  await prisma.staffMember.create({
    data: { userId: teacher.id, designation: "Teacher", department: "Primary", employeeId: "EMP-001", joiningDate: new Date("2022-06-01"), qualification: "B.Ed", experience: "5 years", phone: teacher.phone, gender: "MALE", status: "ACTIVE", salary: 35000, schoolId: school.id },
  });
  const teacher2 = await prisma.user.create({
    data: { name: "Ms. Grace Hopper", email: "grace@school.edu", password: passwordHash, phone: "+91-555-0105", role: ROLES.TEACHER, schoolId: school.id,
      staffMember: { create: { designation: "Teacher", department: "Science", employeeId: "EMP-002", joiningDate: new Date("2021-04-01"), qualification: "M.Sc, B.Ed", experience: "8 years", gender: "FEMALE", status: "ACTIVE", salary: 42000, schoolId: school.id } } },
  });
  const teacher3 = await prisma.user.create({
    data: { name: "Mr. Raj Kumar", email: "raj@school.edu", password: passwordHash, phone: "+91-555-0106", role: ROLES.TEACHER, schoolId: school.id,
      staffMember: { create: { designation: "Teacher", department: "Languages", employeeId: "EMP-003", joiningDate: new Date("2023-06-01"), qualification: "M.A English", experience: "3 years", gender: "MALE", status: "ACTIVE", salary: 32000, schoolId: school.id } } },
  });

  // 14. PERIOD TEMPLATES — the bell schedule (shared by all classes). Two CLASS
  //     periods, a BREAK, then two more — enough to build a timetable against.
  const periodDefs = [
    { periodNumber: 1, label: "Period 1", startTime: "09:00", endTime: "09:45", type: "CLASS" },
    { periodNumber: 2, label: "Period 2", startTime: "09:45", endTime: "10:30", type: "CLASS" },
    { periodNumber: 3, label: "Short Break", startTime: "10:30", endTime: "10:45", type: "BREAK" },
    { periodNumber: 4, label: "Period 3", startTime: "10:45", endTime: "11:30", type: "CLASS" },
    { periodNumber: 5, label: "Period 4", startTime: "11:30", endTime: "12:15", type: "CLASS" },
  ];
  await prisma.periodTemplate.createMany({ data: periodDefs.map((p) => ({ ...p, schoolId: school.id })) });

  // 15. TIMETABLE — fill class 1st / section A for a couple of days. We map each
  //     CLASS period to a subject + a teacher. (BREAK periods get no entry.)
  const subById = await prisma.subject.findMany({ where: { classId: class1.id }, select: { id: true, name: true } });
  const subjByName = Object.fromEntries(subById.map((s) => [s.name, s.id]));
  const ttRows = [
    { day: "MON", period: 1, subject: "English", teacherId: teacher3.id },
    { day: "MON", period: 2, subject: "Mathematics", teacherId: teacher.id },
    { day: "MON", period: 4, subject: "Science", teacherId: teacher2.id },
    { day: "MON", period: 5, subject: "English", teacherId: teacher3.id },
    { day: "TUE", period: 1, subject: "Mathematics", teacherId: teacher.id },
    { day: "TUE", period: 2, subject: "Science", teacherId: teacher2.id },
    { day: "TUE", period: 4, subject: "English", teacherId: teacher3.id },
    { day: "WED", period: 1, subject: "Science", teacherId: teacher2.id },
    { day: "WED", period: 2, subject: "English", teacherId: teacher3.id },
  ];
  await prisma.timetableEntry.createMany({
    data: ttRows.map((r) => ({ classId: class1.id, sectionId: sec1A.id, dayOfWeek: r.day, periodNumber: r.period, subjectId: subjByName[r.subject], teacherId: r.teacherId, academicYearId: academicYear.id, schoolId: school.id })),
  });

  // 16. VIRTUAL CLASSROOMS — one already past (with a recording), one happening
  //     "now" (live), one upcoming. scheduledAt is relative so demos stay fresh.
  const hourFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000);
  await prisma.virtualClassroom.createMany({
    data: [
      { title: "Maths: Addition Recap", description: "Recorded session on carrying.", meetingLink: "https://meet.google.com/abc-defg-hij", recordingUrl: "https://drive.google.com/file/d/demo/view", classId: class1.id, sectionId: sec1A.id, subjectId: subjByName["Mathematics"], scheduledAt: hourFromNow(-26), duration: 45, hostId: teacher.id, status: "COMPLETED", schoolId: school.id },
      { title: "Science: The Water Cycle", description: "Live now — join in!", meetingLink: "https://zoom.us/j/1234567890", classId: class1.id, sectionId: sec1A.id, subjectId: subjByName["Science"], scheduledAt: hourFromNow(-0.2), duration: 45, hostId: teacher2.id, status: "SCHEDULED", schoolId: school.id },
      { title: "English: Story Time", description: "Reading aloud session.", meetingLink: "https://meet.google.com/xyz-uvwx-yz", classId: class1.id, sectionId: sec1A.id, subjectId: subjByName["English"], scheduledAt: hourFromNow(3), duration: 45, hostId: teacher3.id, status: "SCHEDULED", schoolId: school.id },
    ],
  });

  // 17. MEETING ROOM — one staff group with the principal (ADMIN) + teachers,
  //     a few messages, and a SYSTEM "group created" line.
  const group = await prisma.meetingGroup.create({
    data: {
      name: "Primary Teachers", description: "Coordination for the primary wing.", createdById: principal.id, schoolId: school.id,
      members: {
        create: [
          { userId: principal.id, role: "ADMIN", lastReadAt: new Date() },
          { userId: teacher.id, role: "MEMBER" },
          { userId: teacher2.id, role: "MEMBER" },
          { userId: teacher3.id, role: "MEMBER" },
        ],
      },
    },
  });
  const minsAgo = (m: number) => new Date(Date.now() - m * 60 * 1000);
  await prisma.meetingMessage.createMany({
    data: [
      { groupId: group.id, senderId: principal.id, message: "Group created", messageType: "SYSTEM", createdAt: minsAgo(120) },
      { groupId: group.id, senderId: principal.id, message: "Welcome everyone! Use this group for daily coordination.", createdAt: minsAgo(90) },
      { groupId: group.id, senderId: teacher2.id, message: "Thanks! Should we finalise the sports day schedule here?", createdAt: minsAgo(45) },
      { groupId: group.id, senderId: teacher.id, message: "Yes, I'll share a draft this afternoon.", createdAt: minsAgo(10) },
    ],
  });

  // 18. PLANNERS & RESOURCES.
  await prisma.planner.createMany({
    data: [
      { title: "Week 1 — Numbers 1–10", description: "Introduce counting with manipulatives. Day 1: number recognition…", type: "WEEKLY_PLAN", classId: class1.id, subjectId: subjByName["Mathematics"], createdById: teacher.id, schoolId: school.id },
      { title: "Art & Craft: Paper Collage", description: "Materials: coloured paper, glue. Outcome: fine motor skills.", type: "ACTIVITY", classId: class1.id, createdById: teacher3.id, schoolId: school.id },
      { title: "Lesson: The Water Cycle", description: "Evaporation → condensation → precipitation with a kettle demo.", type: "LESSON_PLAN", classId: class1.id, subjectId: subjByName["Science"], createdById: teacher2.id, schoolId: school.id },
    ],
  });
  await prisma.resource.createMany({
    data: [
      { title: "Addition Worksheet 1", description: "20 single-digit sums.", type: "WORKSHEET", externalUrl: "https://example.com/addition1.pdf", fileName: "addition1.pdf", subjectId: subjByName["Mathematics"], uploadedById: teacher.id, downloadCount: 5, isPublic: true, schoolId: school.id },
      { title: "Phonics Song (video)", description: "Alphabet phonics sing-along.", type: "VIDEO", externalUrl: "https://youtube.com/watch?v=demo", subjectId: subjByName["English"], uploadedById: teacher3.id, downloadCount: 12, isPublic: true, schoolId: school.id },
      { title: "Water Cycle Diagram", description: "Labelled diagram for the lesson.", type: "DOCUMENT", externalUrl: "https://example.com/watercycle.png", fileName: "watercycle.png", subjectId: subjByName["Science"], uploadedById: teacher2.id, downloadCount: 3, isPublic: false, schoolId: school.id },
    ],
  });

  // 19. DAYCARE — Mia is the daycare child (isDaycare:true). Give her a log for
  //     YESTERDAY (full history example) and a partial one for TODAY (checked in).
  const dayUTC0 = dayUTC(0);
  const dayUTCm1 = dayUTC(-1);
  const at = (h: number, m: number) => { const d = new Date(); d.setHours(h, m, 0, 0); return d; };
  // Yesterday: a complete day with mood + activities + meals + nap.
  await prisma.daycareLog.create({
    data: {
      studentId: mia.id, date: dayUTCm1, checkInTime: at(8, 30), checkOutTime: at(16, 15), mood: "HAPPY",
      generalNotes: "Had a great day, very cheerful.", recordedById: teacher.id, schoolId: school.id,
      activities: { create: [
        { time: "09:30", activityType: "STORY_TIME", activityName: "Story Time", notes: "Enjoyed the picture book." },
        { time: "11:00", activityType: "OUTDOOR", activityName: "Outdoor Play", notes: "Played on the slide." },
      ] },
      meals: { create: [
        { mealType: "BREAKFAST", eaten: true, time: "08:45", notes: "Ate well" },
        { mealType: "LUNCH", eaten: true, time: "12:30", notes: "Finished everything" },
        { mealType: "AFTERNOON_SNACK", eaten: false, time: "15:00", notes: "Not hungry" },
      ] },
      naps: { create: [{ startTime: "13:00", endTime: "14:00", quality: "SLEPT_WELL" }] },
    },
  });
  // Today: just checked in, log in progress.
  await prisma.daycareLog.create({
    data: { studentId: mia.id, date: dayUTC0, checkInTime: at(8, 25), recordedById: teacher.id, schoolId: school.id,
      activities: { create: [{ time: "09:15", activityType: "FREE_PLAY", activityName: "Free Play", notes: "Building blocks." }] },
      meals: { create: [{ mealType: "BREAKFAST", eaten: true, time: "08:40", notes: "Ate well" }] },
    },
  });

  // 20. VISITORS — a mix: some checked out, some still on premises today.
  const minsAgoV = (m: number) => new Date(Date.now() - m * 60 * 1000);
  await prisma.visitorRegister.createMany({
    data: [
      { name: "Ramesh Kumar", phone: "9876543210", purpose: "PARENT_VISIT", visitingWhomId: principal.id, checkInTime: minsAgoV(180), checkOutTime: minsAgoV(150), idProofType: "AADHAAR", idNumber: "XXXX-1234", schoolId: school.id },
      { name: "BookWorld Supplies", phone: "9811122233", purpose: "VENDOR", visitingWhomId: principal.id, checkInTime: minsAgoV(90), checkOutTime: minsAgoV(40), idProofType: "DRIVING_LICENSE", schoolId: school.id },
      { name: "Sunita Sharma", phone: "9876543210", purpose: "PARENT_VISIT", visitingWhomId: teacher.id, checkInTime: minsAgoV(45), idProofType: "AADHAAR", notes: "Discussing admission", schoolId: school.id }, // still here
      { name: "Education Dept Official", phone: "9999000011", purpose: "OFFICIAL", visitingWhomId: principal.id, checkInTime: minsAgoV(20), idProofType: "VOTER_ID", schoolId: school.id }, // still here
    ],
  });
  // A repeat visitor: Ramesh's phone appears multiple times across past days.
  const daysAgoV = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);
  await prisma.visitorRegister.createMany({
    data: [2, 5, 9].map((d) => ({ name: "Ramesh Kumar", phone: "9876543210", purpose: "PARENT_VISIT", visitingWhomId: teacher.id, checkInTime: daysAgoV(d), checkOutTime: new Date(daysAgoV(d).getTime() + 30 * 60000), idProofType: "AADHAAR", schoolId: school.id })),
  });

  // 21. ENQUIRY CATEGORIES + a funnel of enquiries across the pipeline.
  const [catAcademic, catFees] = await Promise.all([
    prisma.enquiryCategory.create({ data: { name: "Academic", schoolId: school.id } }),
    prisma.enquiryCategory.create({ data: { name: "Fees", schoolId: school.id } }),
  ]);
  await prisma.enquiryCategory.create({ data: { name: "Transport", schoolId: school.id } });

  const dayUTCe = (off: number) => { const n = new Date(); return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate() + off)); };
  async function makeEnquiry(d: { parentName: string; phone: string; childName: string; classInterestedIn: string; source: string; status: string; categoryId?: string; followUpDate?: Date | null; closureReason?: string | null }) {
    const e = await prisma.enquiry.create({ data: { parentName: d.parentName, phone: d.phone, childName: d.childName, classInterestedIn: d.classInterestedIn, source: d.source, status: d.status, categoryId: d.categoryId, followUpDate: d.followUpDate ?? null, closureReason: d.closureReason ?? null, message: "Asked about curriculum and timings.", schoolId: school.id } });
    await prisma.enquiryActivity.create({ data: { enquiryId: e.id, activityType: "STATUS_CHANGE", toStatus: "NEW", note: "Enquiry created", performedById: principal.id } });
    return e;
  }
  await makeEnquiry({ parentName: "Asha Verma", phone: "9000000001", childName: "Riya Verma", classInterestedIn: "1st", source: "WEBSITE", status: "NEW", categoryId: catAcademic.id, followUpDate: dayUTCe(0) });
  await makeEnquiry({ parentName: "Vikram Singh", phone: "9000000002", childName: "Arjun Singh", classInterestedIn: "2nd", source: "PHONE", status: "NEW", categoryId: catFees.id });
  await makeEnquiry({ parentName: "Deepa Nair", phone: "9000000003", childName: "Kiran Nair", classInterestedIn: "1st", source: "REFERRAL", status: "CONTACTED", categoryId: catAcademic.id, followUpDate: dayUTCe(0) });
  await makeEnquiry({ parentName: "Mohan Rao", phone: "9000000004", childName: "Tara Rao", classInterestedIn: "1st", source: "WALKIN", status: "VISIT_SCHEDULED", followUpDate: dayUTCe(2) });
  await makeEnquiry({ parentName: "Latha Iyer", phone: "9000000005", childName: "Sam Iyer", classInterestedIn: "2nd", source: "WEBSITE", status: "CLOSED", closureReason: "Chose Other School" });

  // 22. ADMISSIONS — a few applications in the PENDING/APPROVED/REJECTED pipeline.
  await prisma.admissionQuery.create({
    data: { studentName: "Neha Gupta", parentName: "Rajesh Gupta", motherName: "Pooja Gupta", phone: "9000111001", email: "rajesh@example.com", classAppliedFor: "1st", gender: "FEMALE", source: "DIRECT", status: "PENDING", schoolId: school.id,
      activities: { create: { activityType: "STATUS_CHANGE", note: "Application received", performedById: principal.id } } },
  });
  await prisma.admissionQuery.create({
    data: { studentName: "Karan Mehta", parentName: "Sanjay Mehta", phone: "9000111002", classAppliedFor: "2nd", gender: "MALE", source: "WEBSITE", status: "PENDING", schoolId: school.id,
      activities: { create: { activityType: "STATUS_CHANGE", note: "Application received", performedById: principal.id } } },
  });
  await prisma.admissionQuery.create({
    data: { studentName: "Isha Reddy", parentName: "Venkat Reddy", phone: "9000111003", classAppliedFor: "1st", gender: "FEMALE", source: "REFERRAL", status: "REJECTED", rejectionReason: "Class full", processedById: principal.id, processedAt: new Date(), schoolId: school.id,
      activities: { create: { activityType: "REJECTED", note: "Class full", performedById: principal.id } } },
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
