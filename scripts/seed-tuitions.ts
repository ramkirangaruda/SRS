// One-off, idempotent demo: one tuition batch with two enrolled students and a
// payment, so the Tuitions module has data to show. Safe to re-run.
// Run: npx tsx scripts/seed-tuitions.ts
import { prisma } from "../lib/prisma";
import { toMinor } from "../lib/money";

async function main() {
  const schools = await prisma.school.findMany({ select: { id: true, name: true } });
  for (const s of schools) {
    if ((await prisma.tuitionBatch.count({ where: { schoolId: s.id } })) > 0) {
      console.log(`skip "${s.name}" — already has tuition batches`);
      continue;
    }
    const principal = await prisma.user.findFirst({ where: { schoolId: s.id, role: "PRINCIPAL" }, select: { id: true } });
    const students = await prisma.student.findMany({ where: { schoolId: s.id }, select: { id: true }, take: 2 });
    if (!principal || students.length === 0) {
      console.log(`skip "${s.name}" — missing principal/students`);
      continue;
    }
    const batch = await prisma.tuitionBatch.create({
      data: {
        name: "Maths · Grade 5 · Evening", subject: "Maths", feeAmount: toMinor(2000),
        schedule: "Mon/Wed/Fri 5–6pm", tutorId: principal.id, schoolId: s.id,
      },
    });
    await prisma.tuitionEnrollment.createMany({ data: students.map((st) => ({ batchId: batch.id, studentId: st.id })) });
    // One partial payment for the first student.
    await prisma.tuitionPayment.create({
      data: { batchId: batch.id, studentId: students[0].id, amount: toMinor(1000), mode: "CASH", collectedById: principal.id, schoolId: s.id },
    });
    console.log(`"${s.name}" -> created batch with ${students.length} students + 1 payment`);
  }
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
