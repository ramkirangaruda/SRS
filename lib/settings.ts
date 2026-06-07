// Settings data layer — academic years, school profile, password, sharing,
// users, support, legal, and notification preferences.
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { ROLES } from "@/lib/roles";

const clean = (v?: string | null) => (v && v.trim() !== "" ? v.trim() : null);

// ---- ACADEMIC YEARS ----
// Year-scoping recap: we NEVER delete or archive on a year switch. Every
// year-scoped record carries an academicYearId; switching just changes
// School.activeAcademicYear (the default filter). Old years stay fully queryable.
export async function listAcademicYears(schoolId: string) {
  const rows = await prisma.academicYear.findMany({ where: { schoolId }, orderBy: { startDate: "desc" } });
  return rows.map((y) => ({ id: y.id, name: y.name, startDate: y.startDate.toISOString(), endDate: y.endDate.toISOString(), isActive: y.isActive }));
}

export async function createAcademicYear(schoolId: string, input: { name: string; startDate: string; endDate: string; setActive?: boolean }) {
  return prisma.$transaction(async (tx) => {
    if (input.setActive) {
      await tx.academicYear.updateMany({ where: { schoolId }, data: { isActive: false } });
    }
    const y = await tx.academicYear.create({ data: { name: input.name, startDate: new Date(input.startDate), endDate: new Date(input.endDate), isActive: !!input.setActive, schoolId } });
    if (input.setActive) await tx.school.update({ where: { id: schoolId }, data: { activeAcademicYear: y.name } });
    return y;
  });
}

export async function activateAcademicYear(schoolId: string, yearId: string) {
  const y = await prisma.academicYear.findFirst({ where: { id: yearId, schoolId } });
  if (!y) return null;
  const isPast = y.endDate.getTime() < Date.now();
  await prisma.$transaction([
    prisma.academicYear.updateMany({ where: { schoolId }, data: { isActive: false } }),
    prisma.academicYear.update({ where: { id: yearId }, data: { isActive: true } }),
    prisma.school.update({ where: { id: schoolId }, data: { activeAcademicYear: y.name } }),
  ]);
  return { name: y.name, isPast };
}

// ---- SCHOOL PROFILE ----
export async function getSchoolProfile(schoolId: string) {
  return prisma.school.findUnique({
    where: { id: schoolId },
    select: { name: true, address: true, phone: true, email: true, logo: true, website: true, establishedYear: true, board: true, schoolCode: true },
  });
}
export async function updateSchoolProfile(schoolId: string, input: Record<string, unknown>) {
  return prisma.school.update({
    where: { id: schoolId },
    data: {
      name: String(input.name), address: clean(input.address as string), phone: clean(input.phone as string), email: clean(input.email as string),
      logo: clean(input.logo as string), website: clean(input.website as string), establishedYear: clean(input.establishedYear as string),
      board: clean(input.board as string), schoolCode: clean(input.schoolCode as string),
    },
    select: { name: true },
  });
}

// ---- CHANGE PASSWORD ----
// New-password rule: ≥8 chars, at least one upper, one lower, one digit.
export function passwordMeetsPolicy(pw: string): boolean {
  return pw.length >= 8 && /[a-z]/.test(pw) && /[A-Z]/.test(pw) && /\d/.test(pw);
}
export async function changePassword(userId: string, current: string, next: string): Promise<"ok" | "wrong" | "weak"> {
  if (!passwordMeetsPolicy(next)) return "weak";
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { password: true } });
  if (!user) return "wrong";
  if (!(await bcrypt.compare(current, user.password))) return "wrong";
  const hash = await bcrypt.hash(next, 10);
  // Setting passwordChangedAt invalidates every JWT issued before now (lib/auth.ts).
  await prisma.user.update({ where: { id: userId }, data: { password: hash, passwordChangedAt: new Date() } });
  return "ok";
}

// ---- SHARE: invite code, stats, bulk invite ----
// Secure code generation: crypto.randomBytes (CSPRNG), NOT Math.random (which is
// predictable). We map random bytes to an unambiguous alphabet (no 0/O/1/I).
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomBlock(len: number): string {
  const bytes = randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}
function newInviteCode(): string {
  return `SCH-${randomBlock(4)}-${randomBlock(4)}`;
}
export async function getOrCreateInviteCode(schoolId: string): Promise<string> {
  const s = await prisma.school.findUnique({ where: { id: schoolId }, select: { inviteCode: true } });
  if (s?.inviteCode) return s.inviteCode;
  // Generate + persist, retrying on the (astronomically unlikely) unique clash.
  for (let i = 0; i < 5; i++) {
    const code = newInviteCode();
    try { await prisma.school.update({ where: { id: schoolId }, data: { inviteCode: code } }); return code; }
    catch { /* unique clash → retry */ }
  }
  throw new Error("Could not generate invite code");
}
export async function regenerateInviteCode(schoolId: string): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const code = newInviteCode();
    try { await prisma.school.update({ where: { id: schoolId }, data: { inviteCode: code } }); return code; }
    catch { /* retry */ }
  }
  throw new Error("Could not regenerate invite code");
}

export async function shareStats(schoolId: string) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [totalStudents, parentAccounts, everLoggedIn, activeRecently] = await Promise.all([
    prisma.student.count({ where: { schoolId } }),
    prisma.user.count({ where: { schoolId, role: ROLES.PARENT } }),
    prisma.user.count({ where: { schoolId, role: ROLES.PARENT, lastLoginAt: { not: null } } }),
    prisma.user.count({ where: { schoolId, role: ROLES.PARENT, lastLoginAt: { gte: sevenDaysAgo } } }),
  ]);
  return { totalStudents, parentAccounts, everLoggedIn, activeRecently };
}

// BULK INVITE: create parent accounts from CSV rows. The DB writes for all valid
// rows go in ONE transaction (all-or-nothing for data integrity); per-row
// notification (email/SMS) is best-effort and reported separately — a failed
// "send" must NOT roll back the created accounts. We skip rows whose email
// already exists (reported as skipped) rather than aborting the whole batch.
export async function bulkInviteParents(schoolId: string, rows: { name: string; email: string; phone?: string }[]) {
  const results: { email: string; status: "created" | "skipped" | "error"; tempPassword?: string; reason?: string }[] = [];
  const valid: { name: string; email: string; phone?: string; tempPassword: string; hash: string }[] = [];

  for (const r of rows) {
    if (!r.name?.trim() || !r.email?.trim()) { results.push({ email: r.email ?? "", status: "error", reason: "Missing name or email" }); continue; }
    const exists = await prisma.user.findUnique({ where: { email: r.email.trim() }, select: { id: true } });
    if (exists) { results.push({ email: r.email, status: "skipped", reason: "Account already exists" }); continue; }
    const tempPassword = `Parent-${randomBlock(4)}`;
    valid.push({ name: r.name.trim(), email: r.email.trim(), phone: clean(r.phone) ?? undefined, tempPassword, hash: await bcrypt.hash(tempPassword, 10) });
  }

  if (valid.length) {
    await prisma.$transaction(valid.map((v) => prisma.user.create({ data: { name: v.name, email: v.email, phone: v.phone, password: v.hash, role: ROLES.PARENT, schoolId } })));
  }
  for (const v of valid) results.push({ email: v.email, status: "created", tempPassword: v.tempPassword });
  // (In production we'd now email/SMS each created account's credentials; a send
  // failure here would be caught and reported without undoing the account.)
  return { created: valid.length, skipped: results.filter((r) => r.status === "skipped").length, errors: results.filter((r) => r.status === "error").length, results };
}

// ---- MANAGE USERS ----
export async function listUsers(schoolId: string, opts: { role?: string; status?: string; search?: string; page?: number } = {}) {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = 25;
  const where = {
    schoolId,
    ...(clean(opts.role) ? { role: opts.role } : {}),
    ...(opts.status === "active" ? { isActive: true } : opts.status === "inactive" ? { isActive: false } : {}),
    ...(clean(opts.search) ? { OR: [{ name: { contains: opts.search } }, { email: { contains: opts.search } }] } : {}),
  };
  const [rows, total] = await Promise.all([
    prisma.user.findMany({ where, select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, lastLoginAt: true }, orderBy: { name: "asc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.user.count({ where }),
  ]);
  return { data: rows.map((u) => ({ ...u, lastLoginAt: u.lastLoginAt?.toISOString() ?? null })), total, page, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function createUser(schoolId: string, input: { name: string; email: string; phone?: string; role: string; password?: string; studentIds?: string[] }) {
  const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (exists) return { ok: false as const, error: "Email already in use" };
  const tempPassword = input.password && input.password.length >= 6 ? input.password : `User-${randomBlock(4)}`;
  const hash = await bcrypt.hash(tempPassword, 10);
  const user = await prisma.user.create({ data: { name: input.name, email: input.email, phone: clean(input.phone), password: hash, role: input.role, schoolId } });
  // Link selected students to a parent.
  if (input.role === ROLES.PARENT && input.studentIds?.length) {
    await prisma.student.updateMany({ where: { id: { in: input.studentIds }, schoolId }, data: { parentId: user.id } });
  }
  return { ok: true as const, id: user.id, tempPassword };
}

export async function resetUserPassword(schoolId: string, userId: string) {
  const u = await prisma.user.findFirst({ where: { id: userId, schoolId }, select: { id: true } });
  if (!u) return null;
  const tempPassword = `Temp-${randomBlock(4)}`;
  const hash = await bcrypt.hash(tempPassword, 10);
  // Reset also bumps passwordChangedAt → kicks the user off other devices.
  await prisma.user.update({ where: { id: userId }, data: { password: hash, passwordChangedAt: new Date() } });
  return tempPassword;
}

export async function toggleUserStatus(schoolId: string, userId: string) {
  const u = await prisma.user.findFirst({ where: { id: userId, schoolId }, select: { id: true, isActive: true } });
  if (!u) return null;
  await prisma.user.update({ where: { id: userId }, data: { isActive: !u.isActive } });
  return !u.isActive;
}

export async function listLinkableStudents(schoolId: string) {
  return prisma.student.findMany({ where: { schoolId }, select: { id: true, name: true, admissionNumber: true, class: { select: { name: true } } }, orderBy: { name: "asc" } });
}

// ---- SUPPORT ----
export async function createSupportMessage(schoolId: string, userId: string, subject: string, message: string) {
  return prisma.supportMessage.create({ data: { schoolId, sentById: userId, subject, message } });
}
export async function createBugReport(schoolId: string, userId: string, description: string, deviceInfo?: string | null, screenshot?: string | null) {
  return prisma.bugReport.create({ data: { schoolId, reportedById: userId, description, deviceInfo: clean(deviceInfo), screenshot: clean(screenshot) } });
}

// ---- LEGAL ----
const DEFAULT_PRIVACY = "We collect student and parent information solely to operate the school's services...\n\nData storage: information is stored securely and never sold.\n\nParent rights: you may request access to or deletion of your child's data.\n\nContact: reach the school office for any data concerns.";
const DEFAULT_TERMS = "By using this app you agree to use it for legitimate school communication only...\n\nAccounts are personal; do not share your password.\n\nThe school may update these terms; continued use constitutes acceptance.";
export async function getLegal(schoolId: string, type: "privacy" | "terms") {
  const s = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true, privacyPolicy: true, termsOfService: true } });
  const content = type === "privacy" ? s?.privacyPolicy ?? DEFAULT_PRIVACY : s?.termsOfService ?? DEFAULT_TERMS;
  return { schoolName: s?.name ?? "School", content };
}
export async function updateLegal(schoolId: string, type: "privacy" | "terms", content: string) {
  return prisma.school.update({ where: { id: schoolId }, data: type === "privacy" ? { privacyPolicy: content } : { termsOfService: content }, select: { id: true } });
}
// First school (for the public, unauthenticated legal pages + login footer).
export async function firstSchoolId(): Promise<string | null> {
  const s = await prisma.school.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
  return s?.id ?? null;
}

// ---- NOTIFICATION PREFERENCES ----
export const NOTIFICATION_TYPES = ["BROADCAST", "HOMEWORK", "FEES", "ATTENDANCE", "EVENTS", "DIARY"] as const;
export async function getNotificationPrefs(userId: string): Promise<Record<string, boolean>> {
  const rows = await prisma.notificationPreference.findMany({ where: { userId }, select: { type: true, enabled: true } });
  const map = new Map(rows.map((r) => [r.type, r.enabled]));
  // Default ON when no explicit row exists.
  const out: Record<string, boolean> = {};
  for (const t of NOTIFICATION_TYPES) out[t] = map.get(t) ?? true;
  return out;
}
export async function updateNotificationPrefs(userId: string, schoolId: string, prefs: Record<string, boolean>) {
  await prisma.$transaction(
    NOTIFICATION_TYPES.filter((t) => t in prefs).map((t) =>
      prisma.notificationPreference.upsert({
        where: { userId_type: { userId, type: t } },
        create: { userId, type: t, enabled: prefs[t], schoolId },
        update: { enabled: prefs[t] },
      })
    )
  );
  return getNotificationPrefs(userId);
}
// Called at SEND time by notification producers (broadcast, fees, etc.) so we
// never even queue a notification a user opted out of.
export async function isNotificationEnabled(userId: string, type: string): Promise<boolean> {
  const row = await prisma.notificationPreference.findUnique({ where: { userId_type: { userId, type } }, select: { enabled: true } });
  return row?.enabled ?? true; // default ON
}
