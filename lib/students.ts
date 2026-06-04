// Student data-access layer. ALL database logic for students lives here, so both
// the API routes (which add HTTP + auth) and Server Components (which call these
// directly) share one implementation — no duplicated Prisma queries.
//
// Every function takes a `schoolId` and scopes its query to it. That's our
// multi-tenant guard: a principal can only ever touch their own school's data.
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ROLES } from "@/lib/roles";
import type { StudentCreateInput, StudentUpdateInput } from "@/lib/validations/student";

// The exact shape returned by our list/detail queries (student + its relations).
// Deriving it from Prisma keeps the type in lockstep with the actual query, so
// the UI components are fully typed end to end.
export type StudentWithRelations = Prisma.StudentGetPayload<{
  include: {
    class: true;
    section: true;
    parent: { select: { id: true; name: true; phone: true; email: true } };
  };
}>;

// A child as shown in the parent view (no parent relation needed there).
export type ChildWithClass = Prisma.StudentGetPayload<{
  include: { class: true; section: true };
}>;

// A class with its sections — used to populate the class/section dropdowns.
export type ClassWithSections = Prisma.ClassGetPayload<{ include: { sections: true } }>;

// What we accept when listing students. All optional — the page provides
// sensible defaults.
export type ListStudentsParams = {
  schoolId: string;
  search?: string; // matches name OR admission number
  classId?: string;
  sectionId?: string;
  page?: number;
  pageSize?: number;
};

// Convert empty strings to undefined (HTML selects/inputs send "" for "no value").
const clean = (v?: string) => (v && v.trim() !== "" ? v : undefined);

// LIST with search + filters + pagination.
//
// WHY PAGINATION? A school can have thousands of students. Fetching them all on
// every page load would be slow, hog memory, and send a huge payload to the
// browser. Instead we fetch ONE page at a time (skip/take) and return the total
// count so the UI can render "Page 2 of 37". The DB does the slicing efficiently
// using the indexes we added (schoolId, classId, sectionId).
export async function listStudents(params: ListStudentsParams) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 10));
  const search = clean(params.search);
  const classId = clean(params.classId);
  const sectionId = clean(params.sectionId);

  // Build the WHERE clause. Each filter is added only if provided.
  const where = {
    schoolId: params.schoolId,
    ...(classId ? { classId } : {}),
    ...(sectionId ? { sectionId } : {}),
    ...(search
      ? {
          // OR: match if EITHER name OR admissionNumber contains the search text.
          OR: [
            { name: { contains: search } },
            { admissionNumber: { contains: search } },
          ],
        }
      : {}),
  };

  // Run the page query and the total count in parallel for speed.
  const [data, total] = await Promise.all([
    prisma.student.findMany({
      where,
      // `include` tells Prisma to also fetch related rows (the student's class,
      // section, and parent) in the SAME query via SQL joins — so we get the
      // parent's name/phone and class/section names without N+1 extra queries.
      include: {
        class: true,
        section: true,
        parent: { select: { id: true, name: true, phone: true, email: true } },
      },
      orderBy: { admissionNumber: "asc" },
      skip: (page - 1) * pageSize, // how many rows to jump over
      take: pageSize, // how many to return
    }),
    prisma.student.count({ where }),
  ]);

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

// READ ONE by id, scoped to the school. Returns null if not found / wrong school.
export async function getStudentById(id: string, schoolId: string) {
  return prisma.student.findFirst({
    where: { id, schoolId },
    include: {
      class: true,
      section: true,
      parent: { select: { id: true, name: true, email: true, phone: true } },
    },
  });
}

// CREATE a student, optionally creating a new parent account in the same
// transaction. A transaction means "all or nothing": if creating the student
// fails, the parent we just created is rolled back too — no orphan accounts.
export async function createStudent(input: StudentCreateInput, schoolId: string) {
  return prisma.$transaction(async (tx) => {
    let parentId = clean(input.parentId);

    // Create a new parent User if the principal chose "new parent".
    if (input.parentMode === "new" && input.newParent) {
      const passwordHash = await bcrypt.hash(input.newParent.password, 10);
      const parent = await tx.user.create({
        data: {
          name: input.newParent.name,
          email: input.newParent.email,
          phone: input.newParent.phone,
          password: passwordHash,
          role: ROLES.PARENT,
          schoolId,
        },
      });
      parentId = parent.id;
    }

    const student = await tx.student.create({
      data: {
        name: input.name,
        admissionNumber: input.admissionNumber,
        dateOfBirth: new Date(input.dateOfBirth),
        gender: clean(input.gender),
        bloodGroup: clean(input.bloodGroup),
        address: clean(input.address),
        photo: clean(input.photo),
        classId: input.classId,
        sectionId: clean(input.sectionId),
        parentId,
        schoolId,
      },
      include: { class: true, section: true, parent: true },
    });

    return student;
  });
}

// UPDATE a student's own fields (not parent linkage). Returns count so the route
// can tell whether the id actually belonged to this school.
export async function updateStudent(id: string, input: StudentUpdateInput, schoolId: string) {
  // updateMany with schoolId in the filter ensures we can't update another
  // school's record even if someone guesses an id.
  const result = await prisma.student.updateMany({
    where: { id, schoolId },
    data: {
      name: input.name,
      admissionNumber: input.admissionNumber,
      dateOfBirth: new Date(input.dateOfBirth),
      gender: clean(input.gender),
      bloodGroup: clean(input.bloodGroup),
      address: clean(input.address),
      photo: clean(input.photo),
      classId: input.classId,
      sectionId: clean(input.sectionId),
    },
  });
  return result.count; // 0 = not found / not this school
}

// DELETE a student, scoped to school. Returns count deleted (0 = not found).
export async function deleteStudent(id: string, schoolId: string) {
  const result = await prisma.student.deleteMany({ where: { id, schoolId } });
  return result.count;
}

// LIST the children of a specific parent (for the parent view). Ownership is
// enforced by filtering on parentId — a parent literally cannot query anyone
// else's children through this function.
export async function listChildrenForParent(parentId: string, schoolId: string) {
  return prisma.student.findMany({
    where: { parentId, schoolId },
    include: { class: true, section: true },
    orderBy: { name: "asc" },
  });
}

// READ one child, but only if it belongs to this parent (returns null otherwise).
export async function getChildForParent(id: string, parentId: string, schoolId: string) {
  return prisma.student.findFirst({
    where: { id, parentId, schoolId },
    include: { class: true, section: true },
  });
}

// Helper for the filter dropdowns + form selects: all classes (with their
// sections) for a school.
export async function listClassesWithSections(schoolId: string) {
  return prisma.class.findMany({
    where: { schoolId },
    include: { sections: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });
}

// Helper for the "existing parent" picker: all parent users in the school.
export async function listParents(schoolId: string) {
  return prisma.user.findMany({
    where: { schoolId, role: ROLES.PARENT },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  });
}
