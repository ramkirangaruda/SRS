// Toddlers data layer — a simple roster of the youngest children, separate from
// the Daycare check-in/out logs. All access is scoped by schoolId (and by parentId
// for the parent-facing read), so access control is structural. Data is shared
// across branches; the branch only decides whether the module is shown.
import { prisma } from "@/lib/prisma";

const clean = (v?: string | null) => (v && v.trim() !== "" ? v.trim() : null);

export type ToddlerRow = {
  id: string;
  name: string;
  dateOfBirth: string | null; // ISO
  gender: string | null;
  photo: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  allergies: string | null;
  medicalNotes: string | null;
  notes: string | null;
  parentId: string | null;
  parentName: string | null;
};

const include = { parent: { select: { name: true } } } as const;
type Row = {
  id: string; name: string; dateOfBirth: Date | null; gender: string | null; photo: string | null;
  guardianName: string | null; guardianPhone: string | null; allergies: string | null;
  medicalNotes: string | null; notes: string | null; parentId: string | null;
  parent: { name: string } | null;
};

function toRow(t: Row): ToddlerRow {
  return {
    id: t.id, name: t.name, dateOfBirth: t.dateOfBirth?.toISOString() ?? null, gender: t.gender,
    photo: t.photo, guardianName: t.guardianName, guardianPhone: t.guardianPhone,
    allergies: t.allergies, medicalNotes: t.medicalNotes, notes: t.notes,
    parentId: t.parentId, parentName: t.parent?.name ?? null,
  };
}

export type ToddlerInput = {
  name: string;
  dateOfBirth?: string | null;
  gender?: string | null;
  photo?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  allergies?: string | null;
  medicalNotes?: string | null;
  notes?: string | null;
  parentId?: string | null;
};

// Map the validated input to the columns. dateOfBirth comes in as "YYYY-MM-DD";
// we store it at UTC midnight so the displayed date never drifts by a timezone.
function toData(input: ToddlerInput, schoolId: string) {
  return {
    name: input.name.trim(),
    dateOfBirth: input.dateOfBirth ? new Date(`${input.dateOfBirth}T00:00:00Z`) : null,
    gender: clean(input.gender),
    photo: clean(input.photo),
    guardianName: clean(input.guardianName),
    guardianPhone: clean(input.guardianPhone),
    allergies: clean(input.allergies),
    medicalNotes: clean(input.medicalNotes),
    notes: clean(input.notes),
    parentId: clean(input.parentId),
    schoolId,
  };
}

// LIST with search (name or guardian) + pagination.
export async function listToddlers(schoolId: string, opts: { search?: string; page?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 50;
  const search = clean(opts.search);
  const where = {
    schoolId,
    ...(search
      ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { guardianName: { contains: search, mode: "insensitive" as const } }] }
      : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.toddler.findMany({ where, include, orderBy: { name: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.toddler.count({ where }),
  ]);
  return { data: rows.map(toRow), total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getToddler(id: string, schoolId: string): Promise<ToddlerRow | null> {
  const t = await prisma.toddler.findFirst({ where: { id, schoolId }, include });
  return t ? toRow(t) : null;
}

export async function createToddler(input: ToddlerInput, schoolId: string): Promise<ToddlerRow> {
  const t = await prisma.toddler.create({ data: toData(input, schoolId), include });
  return toRow(t);
}

// Update only if the toddler belongs to this school (ownership). Returns null if
// not found so the route can answer 404 instead of 500.
export async function updateToddler(id: string, input: ToddlerInput, schoolId: string): Promise<ToddlerRow | null> {
  const existing = await prisma.toddler.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!existing) return null;
  const { schoolId: _omit, ...data } = toData(input, schoolId);
  const t = await prisma.toddler.update({ where: { id }, data, include });
  return toRow(t);
}

export async function deleteToddler(id: string, schoolId: string): Promise<boolean> {
  const existing = await prisma.toddler.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!existing) return false;
  await prisma.toddler.delete({ where: { id } });
  return true;
}

// Active parents in the school, for the "link to parent account" dropdown.
export async function listParentsForLink(schoolId: string) {
  return prisma.user.findMany({
    where: { schoolId, isActive: true, role: "PARENT" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// PARENT view: only the toddlers linked to this parent.
export async function listToddlersForParent(parentId: string, schoolId: string): Promise<ToddlerRow[]> {
  const rows = await prisma.toddler.findMany({ where: { parentId, schoolId }, include, orderBy: { name: "asc" } });
  return rows.map(toRow);
}
