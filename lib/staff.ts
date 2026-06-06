// Staff data layer.
//
// A staff member is TWO rows that must always agree: a User (so they can log in)
// and a StaffMember (their HR record). We create them together in a TRANSACTION
// so we can never end up with a half-made staff member (a login with no HR record
// or vice-versa). Deactivation is a SOFT operation — we flip status + isActive,
// never delete — so every historical reference (timetable, homework, virtual
// classes) the teacher is attached to stays intact.
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { ROLES } from "@/lib/roles";

export const STAFF_STATUSES = ["ACTIVE", "ON_LEAVE", "RESIGNED"] as const;
export const DESIGNATIONS = ["Principal", "Teacher", "Admin", "Librarian", "Counselor", "Other"] as const;

const clean = (v?: string | null) => (v && v.trim() !== "" ? v.trim() : null);

export type StaffRow = {
  id: string; userId: string; name: string; email: string; phone: string | null;
  designation: string | null; department: string | null; employeeId: string | null;
  status: string; isActive: boolean; joiningDate: string | null;
};

type Row = {
  id: string; userId: string; designation: string | null; department: string | null; employeeId: string | null;
  status: string; joiningDate: Date | null;
  user: { name: string; email: string; phone: string | null; isActive: boolean };
};

function toRow(s: Row): StaffRow {
  return {
    id: s.id, userId: s.userId, name: s.user.name, email: s.user.email, phone: s.user.phone,
    designation: s.designation, department: s.department, employeeId: s.employeeId,
    status: s.status, isActive: s.user.isActive, joiningDate: s.joiningDate?.toISOString() ?? null,
  };
}

// LIST for the directory DataTable, with simple filters.
export async function listStaff(schoolId: string, opts: { search?: string; designation?: string; status?: string; department?: string } = {}) {
  const rows = await prisma.staffMember.findMany({
    where: {
      schoolId,
      ...(clean(opts.designation) ? { designation: opts.designation } : {}),
      ...(clean(opts.status) ? { status: opts.status } : {}),
      ...(clean(opts.department) ? { department: opts.department } : {}),
      ...(clean(opts.search) ? { user: { OR: [{ name: { contains: opts.search } }, { email: { contains: opts.search } }] } } : {}),
    },
    include: { user: { select: { name: true, email: true, phone: true, isActive: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return rows.map(toRow);
}

// Stats cards: headcount + status breakdown + monthly payroll.
export async function getStaffStats(schoolId: string) {
  const rows = await prisma.staffMember.findMany({ where: { schoolId }, select: { status: true, salary: true, allowances: true, designation: true } });
  const total = rows.length;
  const active = rows.filter((r) => r.status === "ACTIVE").length;
  const onLeave = rows.filter((r) => r.status === "ON_LEAVE").length;
  const resigned = rows.filter((r) => r.status === "RESIGNED").length;
  // Payroll only counts currently-active staff.
  const monthlyPayroll = rows.filter((r) => r.status === "ACTIVE").reduce((sum, r) => sum + (r.salary ?? 0) + (r.allowances ?? 0), 0);
  const teachers = rows.filter((r) => r.designation === "Teacher").length;
  return { total, active, onLeave, resigned, teachers, monthlyPayroll };
}

export type StaffDetail = StaffRow & {
  qualification: string | null; experience: string | null; gender: string | null; address: string | null;
  dateOfBirth: string | null; photo: string | null; salary: number | null; allowances: number | null;
  role: string;
};

export async function getStaffDetail(id: string, schoolId: string): Promise<StaffDetail | null> {
  const s = await prisma.staffMember.findFirst({
    where: { id, schoolId },
    include: { user: { select: { name: true, email: true, phone: true, isActive: true, role: true } } },
  });
  if (!s) return null;
  return {
    ...toRow(s as Row),
    qualification: s.qualification, experience: s.experience, gender: s.gender, address: s.address,
    dateOfBirth: s.dateOfBirth?.toISOString() ?? null, photo: s.photo,
    salary: s.salary, allowances: s.allowances, role: s.user.role,
  };
}

// The classes/subjects a staff member teaches, derived from the timetable (we
// don't have a separate "assigned classes" table — the timetable IS the source
// of truth for who teaches what).
export async function getStaffClasses(userId: string, schoolId: string) {
  const rows = await prisma.timetableEntry.findMany({
    where: { schoolId, teacherId: userId },
    include: { class: { select: { name: true } }, section: { select: { name: true } }, subject: { select: { name: true } } },
  });
  const seen = new Map<string, { className: string; sectionName: string; subjects: Set<string> }>();
  for (const r of rows) {
    const k = `${r.classId}-${r.sectionId}`;
    const e = seen.get(k) ?? { className: r.class?.name ?? "", sectionName: r.section?.name ?? "", subjects: new Set<string>() };
    if (r.subject?.name) e.subjects.add(r.subject.name);
    seen.set(k, e);
  }
  return Array.from(seen.values()).map((e) => ({ className: e.className, sectionName: e.sectionName, subjects: Array.from(e.subjects) }));
}

// Generate a readable temporary password, e.g. "Teach-4821".
function tempPassword(): string {
  return `Teach-${Math.floor(1000 + Math.random() * 9000)}`;
}

// CREATE: User(TEACHER) + StaffMember in one transaction. Returns the temp
// password (plaintext, ONE TIME) so the principal can hand it to the new staffer.
export async function createStaff(input: {
  name: string; email: string; phone?: string | null; designation?: string | null; department?: string | null;
  employeeId?: string | null; qualification?: string | null; experience?: string | null; gender?: string | null;
  address?: string | null; dateOfBirth?: string | null; joiningDate?: string | null; salary?: number | null; allowances?: number | null;
}, schoolId: string): Promise<{ ok: true; staffId: string; tempPassword: string } | { ok: false; error: string }> {
  // Email must be unique across all users (it's the login).
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) return { ok: false, error: "A user with this email already exists" };

  const pw = tempPassword();
  const hash = await bcrypt.hash(pw, 10);

  const staff = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name: input.name, email: input.email, phone: clean(input.phone), password: hash, role: ROLES.TEACHER, isActive: true, schoolId },
    });
    return tx.staffMember.create({
      data: {
        userId: user.id, designation: clean(input.designation) ?? "Teacher", department: clean(input.department),
        employeeId: clean(input.employeeId), qualification: clean(input.qualification), experience: clean(input.experience),
        gender: clean(input.gender), address: clean(input.address),
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        joiningDate: input.joiningDate ? new Date(input.joiningDate) : new Date(),
        phone: clean(input.phone), salary: input.salary ?? null, allowances: input.allowances ?? null,
        status: "ACTIVE", schoolId,
      },
    });
  });
  return { ok: true, staffId: staff.id, tempPassword: pw };
}

// UPDATE HR fields + the linked user's name/phone (kept in sync).
export async function updateStaff(id: string, input: {
  name: string; phone?: string | null; designation?: string | null; department?: string | null; employeeId?: string | null;
  qualification?: string | null; experience?: string | null; gender?: string | null; address?: string | null;
  dateOfBirth?: string | null; joiningDate?: string | null; status?: string | null; salary?: number | null; allowances?: number | null;
}, schoolId: string) {
  const s = await prisma.staffMember.findFirst({ where: { id, schoolId }, select: { id: true, userId: true } });
  if (!s) return null;
  await prisma.$transaction([
    prisma.user.update({ where: { id: s.userId }, data: { name: input.name, phone: clean(input.phone) } }),
    prisma.staffMember.update({
      where: { id },
      data: {
        designation: clean(input.designation), department: clean(input.department), employeeId: clean(input.employeeId),
        qualification: clean(input.qualification), experience: clean(input.experience), gender: clean(input.gender),
        address: clean(input.address), phone: clean(input.phone),
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        joiningDate: input.joiningDate ? new Date(input.joiningDate) : undefined,
        ...(input.status ? { status: input.status } : {}),
        salary: input.salary ?? null, allowances: input.allowances ?? null,
      },
    }),
  ]);
  return getStaffDetail(id, schoolId);
}

// SOFT DEACTIVATE: mark RESIGNED + block login. Historical data is preserved.
// `active` true reactivates (status ACTIVE + login restored).
export async function setStaffActive(id: string, schoolId: string, active: boolean) {
  const s = await prisma.staffMember.findFirst({ where: { id, schoolId }, select: { id: true, userId: true } });
  if (!s) return false;
  await prisma.$transaction([
    prisma.staffMember.update({ where: { id }, data: { status: active ? "ACTIVE" : "RESIGNED" } }),
    prisma.user.update({ where: { id: s.userId }, data: { isActive: active } }),
  ]);
  return true;
}

export async function listDepartments(schoolId: string) {
  const rows = await prisma.staffMember.findMany({ where: { schoolId, department: { not: null } }, select: { department: true }, distinct: ["department"] });
  return rows.map((r) => r.department!).filter(Boolean).sort();
}

// ---- PARENT ----
//
// Parents see TEACHERS ONLY (not admin/HR staff), and never salary. Contact
// details (email/phone) are shown only if the school opted in via
// School.showStaffContactToParents — role-based data visibility in action: ONE
// query, the SHAPE of the result is gated by the school setting + role.
export async function getParentStaff(schoolId: string) {
  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { showStaffContactToParents: true } });
  const showContact = school?.showStaffContactToParents ?? false;
  const rows = await prisma.staffMember.findMany({
    where: { schoolId, designation: "Teacher", status: { not: "RESIGNED" }, user: { isActive: true } },
    include: { user: { select: { name: true, email: true, phone: true } } },
    orderBy: { user: { name: "asc" } },
  });
  return {
    showContact,
    staff: rows.map((s) => ({
      id: s.id, name: s.user.name, designation: s.designation, department: s.department,
      qualification: s.qualification, photo: s.photo,
      // Contact fields ONLY included when the school allows it.
      email: showContact ? s.user.email : null,
      phone: showContact ? (s.phone ?? s.user.phone) : null,
    })),
  };
}
