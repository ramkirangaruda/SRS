// Virtual classroom data layer.
//
// WHY WE DON'T BUILD VIDEO (recap): live video is hard (WebRTC, TURN servers,
// scaling). We INTEGRATE instead — a virtual classroom is really just a scheduled
// link to Zoom/Google Meet plus metadata. The "live" state isn't stored as a
// flag we have to flip on a timer; we COMPUTE it from the clock: a class is LIVE
// when now is between scheduledAt and scheduledAt + duration.
import { prisma } from "@/lib/prisma";

export type VCStatus = "UPCOMING" | "LIVE" | "COMPLETED";

const DEFAULT_DURATION = 45; // minutes, if none set

// The single source of truth for "is this class live right now?". Pure function
// of the schedule + the current time — no stored flag to keep in sync.
export function computeStatus(scheduledAt: Date, duration: number | null, now: Date = new Date()): VCStatus {
  const start = scheduledAt.getTime();
  const end = start + (duration ?? DEFAULT_DURATION) * 60_000;
  const t = now.getTime();
  if (t < start) return "UPCOMING";
  if (t <= end) return "LIVE";
  return "COMPLETED";
}

export type VCItem = {
  id: string;
  title: string;
  description: string | null;
  meetingLink: string;
  recordingUrl: string | null;
  scheduledAt: string; // ISO
  duration: number | null;
  status: VCStatus; // computed
  classId: string;
  className: string | null;
  sectionId: string | null;
  sectionName: string | null;
  subjectId: string | null;
  subjectName: string | null;
  hostId: string;
  hostName: string | null;
};

const include = {
  class: { select: { name: true } },
  section: { select: { name: true } },
  subject: { select: { name: true } },
  host: { select: { name: true } },
} as const;

type Row = {
  id: string; title: string; description: string | null; meetingLink: string; recordingUrl: string | null;
  scheduledAt: Date; duration: number | null; classId: string; sectionId: string | null; subjectId: string | null; hostId: string;
  class: { name: string } | null; section: { name: string } | null; subject: { name: string } | null; host: { name: string } | null;
};

function toItem(r: Row, now = new Date()): VCItem {
  return {
    id: r.id, title: r.title, description: r.description, meetingLink: r.meetingLink, recordingUrl: r.recordingUrl,
    scheduledAt: r.scheduledAt.toISOString(), duration: r.duration, status: computeStatus(r.scheduledAt, r.duration, now),
    classId: r.classId, className: r.class?.name ?? null, sectionId: r.sectionId, sectionName: r.section?.name ?? null,
    subjectId: r.subjectId, subjectName: r.subject?.name ?? null, hostId: r.hostId, hostName: r.host?.name ?? null,
  };
}

const clean = (v?: string | null) => (v && v.trim() !== "" ? v : null);

// LIST with a tab filter. "upcoming" = not yet ended (UPCOMING or LIVE);
// "completed" = ended. We compute status in memory after fetching, because
// "ended" depends on scheduledAt + duration, which the DB can't easily express.
export async function listClasses(schoolId: string, filter: "upcoming" | "completed" | "all" = "all", classId?: string) {
  const rows = await prisma.virtualClassroom.findMany({
    where: { schoolId, ...(clean(classId) ? { classId } : {}) },
    include,
    orderBy: { scheduledAt: "asc" },
  });
  const now = new Date();
  const items = rows.map((r) => toItem(r, now));
  if (filter === "upcoming") return items.filter((i) => i.status !== "COMPLETED");
  if (filter === "completed") return items.filter((i) => i.status === "COMPLETED").reverse(); // most recent first
  return items;
}

// Only the classes that are LIVE right now (for the "live" endpoint / badge).
export async function listLive(schoolId: string) {
  return (await listClasses(schoolId, "all")).filter((i) => i.status === "LIVE");
}

export async function getClass(id: string, schoolId: string) {
  const r = await prisma.virtualClassroom.findFirst({ where: { id, schoolId }, include });
  return r ? toItem(r) : null;
}

export async function createClass(input: {
  title: string; description?: string | null; meetingLink: string; scheduledAt: string; duration?: number | null;
  classId: string; sectionId?: string | null; subjectId?: string | null; hostId?: string | null;
}, schoolId: string, fallbackHostId: string) {
  const r = await prisma.virtualClassroom.create({
    data: {
      title: input.title, description: clean(input.description), meetingLink: input.meetingLink,
      scheduledAt: new Date(input.scheduledAt), duration: input.duration ?? DEFAULT_DURATION,
      classId: input.classId, sectionId: clean(input.sectionId), subjectId: clean(input.subjectId),
      // Host defaults to the creator, but a principal may assign another teacher.
      hostId: clean(input.hostId) ?? fallbackHostId, status: "SCHEDULED", schoolId,
    },
    include,
  });
  return toItem(r);
}

export async function updateClass(id: string, input: {
  title: string; description?: string | null; meetingLink: string; scheduledAt: string; duration?: number | null;
  classId: string; sectionId?: string | null; subjectId?: string | null;
}, schoolId: string) {
  const existing = await prisma.virtualClassroom.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!existing) return null;
  const r = await prisma.virtualClassroom.update({
    where: { id },
    data: {
      title: input.title, description: clean(input.description), meetingLink: input.meetingLink,
      scheduledAt: new Date(input.scheduledAt), duration: input.duration ?? DEFAULT_DURATION,
      classId: input.classId, sectionId: clean(input.sectionId), subjectId: clean(input.subjectId),
    },
    include,
  });
  return toItem(r);
}

// Attach a recording link after the session (also marks it COMPLETED).
export async function setRecording(id: string, recordingUrl: string | null, schoolId: string) {
  const existing = await prisma.virtualClassroom.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!existing) return null;
  const r = await prisma.virtualClassroom.update({ where: { id }, data: { recordingUrl: clean(recordingUrl), status: "COMPLETED" }, include });
  return toItem(r);
}

export async function deleteClass(id: string, schoolId: string) {
  const existing = await prisma.virtualClassroom.findFirst({ where: { id, schoolId }, select: { id: true } });
  if (!existing) return false;
  await prisma.virtualClassroom.delete({ where: { id } });
  return true;
}

// ---- PARENT ----
//
// A parent sees virtual classes for their children's class/section. We match the
// same way as homework: same class, and (no section = whole class) OR the child's
// section. Upcoming (incl. live) sorted soonest-first; plus recent completed ones
// that have a recording to watch.
export async function getParentClasses(parentId: string, schoolId: string) {
  const children = await prisma.student.findMany({ where: { parentId, schoolId }, select: { classId: true, sectionId: true } });
  if (children.length === 0) return { upcoming: [], recordings: [] };
  const orClauses = children.map((c) => (c.sectionId ? { classId: c.classId, OR: [{ sectionId: null }, { sectionId: c.sectionId }] } : { classId: c.classId, sectionId: null }));
  const rows = await prisma.virtualClassroom.findMany({ where: { schoolId, OR: orClauses }, include, orderBy: { scheduledAt: "asc" } });
  const now = new Date();
  const items = rows.map((r) => toItem(r, now));
  return {
    upcoming: items.filter((i) => i.status !== "COMPLETED"),
    recordings: items.filter((i) => i.status === "COMPLETED" && i.recordingUrl).reverse(),
  };
}
