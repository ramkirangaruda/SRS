// E-Learning data layer: categories, tutorials, assignments, and submissions.
//
// REFERENTIAL INTEGRITY (categories): a tutorial/assignment row stores a
// categoryId foreign key. The database enforces that this id must point to a
// REAL category — and, with the default Restrict behavior, it REFUSES to delete
// a category that still has rows pointing at it. That prevents "dangling
// pointers" (tutorials whose category vanished). We also check counts first to
// return a friendly error instead of a raw FK violation.
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseAttachments } from "@/lib/homework-format";
import { deleteUploadedFile } from "@/lib/upload";

const clean = (v?: string) => (v && v.trim() !== "" ? v : undefined);

// ---------------- CATEGORIES ----------------
export async function listCategories(schoolId: string) {
  const rows = await prisma.eLearningCategory.findMany({
    where: { schoolId },
    orderBy: { name: "asc" },
    include: { _count: { select: { tutorials: true, assignments: true } } },
  });
  return rows.map((c) => ({ id: c.id, name: c.name, description: c.description, icon: c.icon, color: c.color, tutorialCount: c._count.tutorials, assignmentCount: c._count.assignments }));
}
export async function createCategory(schoolId: string, input: { name: string; description?: string; icon?: string; color?: string }) {
  return prisma.eLearningCategory.create({ data: { name: input.name, description: input.description || null, icon: input.icon || null, color: input.color || null, schoolId } });
}
export async function updateCategory(id: string, schoolId: string, input: { name?: string; description?: string; icon?: string; color?: string }) {
  const r = await prisma.eLearningCategory.updateMany({ where: { id, schoolId }, data: { ...(input.name !== undefined ? { name: input.name } : {}), ...(input.description !== undefined ? { description: input.description || null } : {}), ...(input.icon !== undefined ? { icon: input.icon } : {}), ...(input.color !== undefined ? { color: input.color } : {}) } });
  return r.count > 0;
}
export async function deleteCategory(id: string, schoolId: string): Promise<{ ok: true } | { error: "not_found" | "not_empty" }> {
  const cat = await prisma.eLearningCategory.findFirst({ where: { id, schoolId }, include: { _count: { select: { tutorials: true, assignments: true } } } });
  if (!cat) return { error: "not_found" };
  if (cat._count.tutorials + cat._count.assignments > 0) return { error: "not_empty" }; // referential integrity guard
  try {
    await prisma.eLearningCategory.delete({ where: { id } });
    return { ok: true };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") return { error: "not_empty" };
    throw e;
  }
}

// ---------------- TUTORIALS ----------------
const tutInclude = { category: { select: { name: true } }, class: { select: { name: true } }, uploadedBy: { select: { name: true } } };
function tutItem(t: { id: string; title: string; description: string | null; type: string; videoUrl: string | null; embedUrl: string | null; linkUrl: string | null; fileUrl: string | null; categoryId: string | null; classId: string | null; createdAt: Date; category: { name: string } | null; class: { name: string } | null; uploadedBy: { name: string } | null }) {
  return { id: t.id, title: t.title, description: t.description, type: t.type, videoUrl: t.videoUrl, embedUrl: t.embedUrl, linkUrl: t.linkUrl, fileUrl: t.fileUrl, categoryId: t.categoryId, classId: t.classId, categoryName: t.category?.name ?? null, className: t.class?.name ?? null, uploadedByName: t.uploadedBy?.name ?? null, createdAt: t.createdAt.toISOString() };
}
export async function listTutorials(schoolId: string, opts: { categoryId?: string; classId?: string } = {}) {
  const rows = await prisma.tutorial.findMany({ where: { schoolId, ...(clean(opts.categoryId) ? { categoryId: opts.categoryId } : {}), ...(clean(opts.classId) ? { classId: opts.classId } : {}) }, orderBy: { createdAt: "desc" }, include: tutInclude });
  return rows.map(tutItem);
}
export async function getTutorial(id: string, schoolId: string) {
  const t = await prisma.tutorial.findFirst({ where: { id, schoolId }, include: tutInclude });
  return t ? tutItem(t) : null;
}
export async function createTutorial(schoolId: string, uploadedById: string, input: { title: string; description?: string; type: string; categoryId?: string; classId?: string; videoUrl?: string; embedUrl?: string; linkUrl?: string; fileUrl?: string }) {
  return prisma.tutorial.create({ data: { title: input.title, description: input.description || null, type: input.type, categoryId: clean(input.categoryId) ?? null, classId: clean(input.classId) ?? null, videoUrl: input.videoUrl || null, embedUrl: input.embedUrl || null, linkUrl: input.linkUrl || null, fileUrl: input.fileUrl || null, uploadedById, schoolId } });
}
export async function deleteTutorial(id: string, schoolId: string) {
  const r = await prisma.tutorial.deleteMany({ where: { id, schoolId } });
  return r.count > 0;
}

// ---------------- ASSIGNMENTS ----------------
export async function listAssignments(schoolId: string, opts: { categoryId?: string; classId?: string; status?: string } = {}) {
  const rows = await prisma.assignment.findMany({
    where: { schoolId, ...(clean(opts.categoryId) ? { categoryId: opts.categoryId } : {}), ...(clean(opts.classId) ? { classId: opts.classId } : {}), ...(clean(opts.status) ? { status: opts.status } : {}) },
    orderBy: { dueDate: "asc" },
    include: { category: { select: { name: true } }, class: { select: { name: true } }, _count: { select: { submissions: true } } },
  });
  // Per-assignment class student count (for "x/y submitted").
  const classIds = Array.from(new Set(rows.map((r) => r.classId).filter((x): x is string => !!x)));
  const counts = await prisma.student.groupBy({ by: ["classId"], where: { schoolId, classId: { in: classIds } }, _count: { _all: true } });
  const classCount = new Map(counts.map((c) => [c.classId, c._count._all]));
  return rows.map((a) => ({ id: a.id, title: a.title, categoryName: a.category?.name ?? null, className: a.class?.name ?? null, classId: a.classId, dueDate: a.dueDate.toISOString(), status: a.status, totalMarks: a.totalMarks, submissionCount: a._count.submissions, classStudentCount: a.classId ? classCount.get(a.classId) ?? 0 : 0 }));
}
export async function getAssignment(id: string, schoolId: string) {
  const a = await prisma.assignment.findFirst({ where: { id, schoolId }, include: { category: { select: { name: true } }, class: { select: { name: true } }, section: { select: { name: true } } } });
  if (!a) return null;
  return { id: a.id, title: a.title, description: a.description, dueDate: a.dueDate.toISOString(), status: a.status, totalMarks: a.totalMarks, attachments: parseAttachments(a.attachments), categoryId: a.categoryId, classId: a.classId, sectionId: a.sectionId, categoryName: a.category?.name ?? null, className: a.class?.name ?? null, sectionName: a.section?.name ?? null };
}
export async function createAssignment(schoolId: string, uploadedById: string, input: { title: string; description?: string; categoryId?: string; classId?: string; sectionId?: string; dueDate: string; totalMarks?: number; attachments?: unknown[] }) {
  return prisma.assignment.create({ data: { title: input.title, description: input.description || null, categoryId: clean(input.categoryId) ?? null, classId: clean(input.classId) ?? null, sectionId: clean(input.sectionId) ?? null, dueDate: new Date(input.dueDate), totalMarks: input.totalMarks ?? null, attachments: JSON.stringify(input.attachments ?? []), status: "OPEN", uploadedById, schoolId } });
}
export async function deleteAssignment(id: string, schoolId: string) {
  const r = await prisma.assignment.deleteMany({ where: { id, schoolId } });
  return r.count > 0;
}
export async function setAssignmentStatus(id: string, schoolId: string, status: "OPEN" | "CLOSED") {
  const r = await prisma.assignment.updateMany({ where: { id, schoolId }, data: { status } });
  return r.count > 0;
}

// All students in the assignment's class + their submission (null if none).
export async function getSubmissions(assignmentId: string, schoolId: string) {
  const a = await prisma.assignment.findFirst({ where: { id: assignmentId, schoolId }, select: { classId: true } });
  if (!a) return null;
  const [students, subs] = await Promise.all([
    prisma.student.findMany({ where: { schoolId, ...(a.classId ? { classId: a.classId } : {}) }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.assignmentSubmission.findMany({ where: { assignmentId }, select: { id: true, studentId: true, fileUrl: true, submittedAt: true, grade: true, feedback: true } }),
  ]);
  const byStudent = new Map(subs.map((s) => [s.studentId, s]));
  return students.map((st) => {
    const s = byStudent.get(st.id);
    return { studentId: st.id, studentName: st.name, submission: s ? { id: s.id, fileUrl: s.fileUrl, submittedAt: s.submittedAt.toISOString(), grade: s.grade, feedback: s.feedback } : null };
  });
}
export async function gradeSubmission(submissionId: string, schoolId: string, grade: string, feedback: string) {
  // Scope through the assignment's school.
  const sub = await prisma.assignmentSubmission.findFirst({ where: { id: submissionId, assignment: { schoolId } }, select: { id: true } });
  if (!sub) return false;
  await prisma.assignmentSubmission.update({ where: { id: sub.id }, data: { grade: grade || null, feedback: feedback || null } });
  return true;
}

// ---------------- PARENT ----------------
async function parentClassIds(parentId: string, schoolId: string) {
  const kids = await prisma.student.findMany({ where: { parentId, schoolId }, select: { id: true, classId: true } });
  return { classIds: Array.from(new Set(kids.map((k) => k.classId))), kids };
}
export async function parentTutorials(parentId: string, schoolId: string, categoryId?: string) {
  const { classIds } = await parentClassIds(parentId, schoolId);
  const rows = await prisma.tutorial.findMany({ where: { schoolId, ...(clean(categoryId) ? { categoryId } : {}), OR: [{ classId: null }, { classId: { in: classIds } }] }, orderBy: { createdAt: "desc" }, include: tutInclude });
  return rows.map(tutItem);
}
export async function parentAssignments(parentId: string, schoolId: string, categoryId?: string) {
  const { classIds, kids } = await parentClassIds(parentId, schoolId);
  const rows = await prisma.assignment.findMany({ where: { schoolId, ...(clean(categoryId) ? { categoryId } : {}), classId: { in: classIds } }, orderBy: { dueDate: "asc" }, include: { category: { select: { name: true } }, class: { select: { name: true } } } });
  // For each assignment, find the child in that class + their submission.
  const result = [];
  for (const a of rows) {
    const child = kids.find((k) => k.classId === a.classId);
    const sub = child ? await prisma.assignmentSubmission.findUnique({ where: { assignmentId_studentId: { assignmentId: a.id, studentId: child.id } }, select: { submittedAt: true, grade: true, feedback: true, fileUrl: true } }) : null;
    result.push({ id: a.id, title: a.title, description: a.description, categoryName: a.category?.name ?? null, className: a.class?.name ?? null, dueDate: a.dueDate.toISOString(), status: a.status, totalMarks: a.totalMarks, studentId: child?.id ?? null, submission: sub ? { submittedAt: sub.submittedAt.toISOString(), grade: sub.grade, feedback: sub.feedback, fileUrl: sub.fileUrl } : null });
  }
  return result;
}
// Submit: validate OPEN, due not passed, not already submitted, child in class.
export async function submitAssignment(assignmentId: string, parentId: string, schoolId: string, fileUrl: string): Promise<{ ok: true } | { error: string }> {
  const a = await prisma.assignment.findFirst({ where: { id: assignmentId, schoolId }, select: { id: true, status: true, dueDate: true, classId: true } });
  if (!a) return { error: "Not found" };
  if (a.status !== "OPEN") return { error: "Assignment is closed" };
  if (a.dueDate.getTime() < Date.now()) return { error: "Due date has passed" };
  const child = await prisma.student.findFirst({ where: { parentId, schoolId, ...(a.classId ? { classId: a.classId } : {}) }, select: { id: true } });
  if (!child) return { error: "No child in this class" };
  const existing = await prisma.assignmentSubmission.findUnique({ where: { assignmentId_studentId: { assignmentId, studentId: child.id } }, select: { id: true } });
  if (existing) return { error: "Already submitted" };
  await prisma.assignmentSubmission.create({ data: { assignmentId, studentId: child.id, fileUrl } });
  return { ok: true };
}
export { deleteUploadedFile };
