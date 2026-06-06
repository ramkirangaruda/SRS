// Meeting Room (group chat) data layer.
//
// READ TRACKING (the key design decision): instead of a row-per-(message,user)
// read table OR a `readBy` array on each message, we keep ONE timestamp per
// membership: MeetingGroupMember.lastReadAt. A message is "unread for user U"
// when its createdAt > U's lastReadAt in that group. Why this beats the
// alternatives:
//   • A `readBy` array on the message grows unbounded, must be rewritten on every
//     read, and you can't index "give me U's unread count" — you'd load + scan
//     every message and inspect each array.
//   • A read-row per message per user is correct but explodes writes: 50 members
//     reading a 1,000-message group = 50,000 rows, all written constantly.
//   • The lastReadAt cursor makes unread count a single indexed RANGE COUNT:
//     count messages in group with createdAt > lastReadAt. O(matching rows), no
//     per-message bookkeeping. The (groupId, createdAt) index serves it directly.
// (Per-message "read receipts" would need the row table; we don't need that
// granularity — ticks are derived from members' lastReadAt instead.)
import { prisma } from "@/lib/prisma";
import { encodeCursor, cursorWhere } from "@/lib/cursor";

export const MESSAGE_PAGE = 30;

// Is this user an ACTIVE member of the group? Used to guard every route.
export async function getMembership(groupId: string, userId: string) {
  return prisma.meetingGroupMember.findFirst({ where: { groupId, userId, isActive: true } });
}

export type GroupSummary = {
  id: string; name: string; description: string | null; icon: string | null;
  memberCount: number; unreadCount: number;
  lastMessage: { text: string; senderName: string; at: string; type: string } | null;
  lastActivityAt: string;
};

// All groups the user actively belongs to, each with last message + unread count,
// sorted by most recent activity (so a group jumps to the top on a new message).
export async function listGroups(userId: string, schoolId: string): Promise<GroupSummary[]> {
  const memberships = await prisma.meetingGroupMember.findMany({
    where: { userId, isActive: true, group: { schoolId, isActive: true } },
    include: {
      group: {
        include: {
          _count: { select: { members: { where: { isActive: true } } } },
          messages: { orderBy: { createdAt: "desc" }, take: 1, include: { sender: { select: { name: true } } } },
        },
      },
    },
  });

  const summaries = await Promise.all(memberships.map(async (m) => {
    const g = m.group;
    const last = g.messages[0] ?? null;
    // Unread = messages after my lastReadAt, excluding my own + deleted ones.
    const unreadCount = await prisma.meetingMessage.count({
      where: { groupId: g.id, isDeleted: false, senderId: { not: userId }, ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}) },
    });
    return {
      id: g.id, name: g.name, description: g.description, icon: g.icon,
      memberCount: g._count.members, unreadCount,
      lastMessage: last ? { text: last.isDeleted ? "This message was deleted" : last.message, senderName: last.sender.name, at: last.createdAt.toISOString(), type: last.messageType } : null,
      lastActivityAt: (last?.createdAt ?? g.createdAt).toISOString(),
    };
  }));

  summaries.sort((a, b) => b.lastActivityAt.localeCompare(a.lastActivityAt));
  return summaries;
}

// Total unread across all the user's groups (for the nav badge).
export async function unreadTotal(userId: string, schoolId: string): Promise<number> {
  const memberships = await prisma.meetingGroupMember.findMany({
    where: { userId, isActive: true, group: { schoolId, isActive: true } },
    select: { groupId: true, lastReadAt: true },
  });
  const counts = await Promise.all(memberships.map((m) =>
    prisma.meetingMessage.count({ where: { groupId: m.groupId, isDeleted: false, senderId: { not: userId }, ...(m.lastReadAt ? { createdAt: { gt: m.lastReadAt } } : {}) } })
  ));
  return counts.reduce((a, b) => a + b, 0);
}

export type ChatMessage = {
  id: string; message: string; messageType: string; senderId: string; senderName: string;
  fileUrl: string | null; fileName: string | null; fileType: string | null;
  isDeleted: boolean; createdAt: string;
  // "read" = at least one OTHER active member has lastReadAt >= this message's time.
  readByOthers: boolean;
};

// REVERSE CURSOR PAGINATION for chat.
//
// Chat shows OLDEST→newest top-to-bottom, but you load NEWEST first (that's what
// you want to see when you open a chat) and page BACKWARDS into history as you
// scroll up. So we query ORDER BY createdAt DESC, take 30; the cursor is the
// oldest message we've loaded, and "older" means createdAt < cursor. The client
// reverses each page for display. This is the opposite direction from a normal
// feed (which pages forward into newer/older from the top).
export async function listMessages(groupId: string, userId: string, cursor?: string) {
  const rows = await prisma.meetingMessage.findMany({
    where: { groupId, ...cursorWhere("createdAt", cursor) },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: MESSAGE_PAGE + 1, // fetch one extra to know if there's an older page
    include: { sender: { select: { name: true } } },
  });
  const hasMore = rows.length > MESSAGE_PAGE;
  const page = rows.slice(0, MESSAGE_PAGE);

  // For read-ticks: the latest lastReadAt among OTHER active members.
  const others = await prisma.meetingGroupMember.findMany({ where: { groupId, isActive: true, userId: { not: userId } }, select: { lastReadAt: true } });
  const maxOtherRead = others.reduce<Date | null>((mx, o) => (o.lastReadAt && (!mx || o.lastReadAt > mx) ? o.lastReadAt : mx), null);

  const messages: ChatMessage[] = page.map((m) => ({
    id: m.id, message: m.isDeleted ? "" : m.message, messageType: m.messageType, senderId: m.senderId, senderName: m.sender.name,
    fileUrl: m.isDeleted ? null : m.fileUrl, fileName: m.isDeleted ? null : m.fileName, fileType: m.fileType,
    isDeleted: m.isDeleted, createdAt: m.createdAt.toISOString(),
    readByOthers: !!(maxOtherRead && maxOtherRead >= m.createdAt),
  }));

  const oldest = page[page.length - 1];
  const nextCursor = hasMore && oldest ? encodeCursor(oldest.createdAt.toISOString(), oldest.id) : null;
  // Return newest-first; the client reverses to render oldest→newest.
  return { messages, nextCursor, hasMore };
}

// Fetch only messages AFTER a given time — the polling endpoint's payload.
export async function listMessagesSince(groupId: string, userId: string, sinceIso: string) {
  const rows = await prisma.meetingMessage.findMany({
    where: { groupId, createdAt: { gt: new Date(sinceIso) } },
    orderBy: { createdAt: "asc" },
    include: { sender: { select: { name: true } } },
  });
  return rows.map((m) => ({
    id: m.id, message: m.isDeleted ? "" : m.message, messageType: m.messageType, senderId: m.senderId, senderName: m.sender.name,
    fileUrl: m.fileUrl, fileName: m.fileName, fileType: m.fileType, isDeleted: m.isDeleted, createdAt: m.createdAt.toISOString(), readByOthers: false,
  }));
}

// Mark the group read up to NOW for this user (advances the lastReadAt cursor).
export async function markRead(groupId: string, userId: string) {
  await prisma.meetingGroupMember.updateMany({ where: { groupId, userId }, data: { lastReadAt: new Date() } });
}

export async function sendMessage(groupId: string, userId: string, message: string, file?: { fileUrl: string; fileName: string; fileType: string }) {
  const msg = await prisma.meetingMessage.create({
    data: {
      groupId, senderId: userId, message: message || (file ? file.fileName : ""),
      messageType: file ? "FILE" : "TEXT", fileUrl: file?.fileUrl, fileName: file?.fileName, fileType: file?.fileType,
    },
    include: { sender: { select: { name: true } } },
  });
  // Sender has implicitly read their own message.
  await markRead(groupId, userId);
  return {
    id: msg.id, message: msg.message, messageType: msg.messageType, senderId: msg.senderId, senderName: msg.sender.name,
    fileUrl: msg.fileUrl, fileName: msg.fileName, fileType: msg.fileType, isDeleted: false, createdAt: msg.createdAt.toISOString(), readByOthers: false,
  } as ChatMessage;
}

// Soft-delete own message → renders as "This message was deleted".
export async function deleteMessage(messageId: string, userId: string) {
  const m = await prisma.meetingMessage.findUnique({ where: { id: messageId }, select: { senderId: true } });
  if (!m || m.senderId !== userId) return false;
  await prisma.meetingMessage.update({ where: { id: messageId }, data: { isDeleted: true } });
  return true;
}

// ---- GROUP MANAGEMENT ----

export async function getGroupInfo(groupId: string, schoolId: string) {
  const g = await prisma.meetingGroup.findFirst({
    where: { id: groupId, schoolId, isActive: true },
    include: { members: { where: { isActive: true }, include: { user: { select: { id: true, name: true, email: true, role: true } } }, orderBy: { joinedAt: "asc" } } },
  });
  if (!g) return null;
  return {
    id: g.id, name: g.name, description: g.description, icon: g.icon, createdAt: g.createdAt.toISOString(),
    members: g.members.map((m) => ({ id: m.user.id, name: m.user.name, email: m.user.email, role: m.role })),
  };
}

// Create a group + members + a SYSTEM "Group created" message, in one transaction.
export async function createGroup(params: { name: string; description?: string | null; memberIds: string[]; createdById: string; schoolId: string }) {
  // Principal (creator) is always an ADMIN member; everyone else a MEMBER.
  const memberIds = Array.from(new Set([params.createdById, ...params.memberIds]));
  return prisma.$transaction(async (tx) => {
    const g = await tx.meetingGroup.create({
      data: {
        name: params.name, description: params.description ?? null, createdById: params.createdById, schoolId: params.schoolId,
        members: { create: memberIds.map((uid) => ({ userId: uid, role: uid === params.createdById ? "ADMIN" : "MEMBER", lastReadAt: uid === params.createdById ? new Date() : null })) },
      },
    });
    await tx.meetingMessage.create({ data: { groupId: g.id, senderId: params.createdById, message: "Group created", messageType: "SYSTEM" } });
    return g;
  });
}

export async function updateGroup(groupId: string, schoolId: string, data: { name?: string; description?: string | null }) {
  const g = await prisma.meetingGroup.findFirst({ where: { id: groupId, schoolId }, select: { id: true } });
  if (!g) return false;
  await prisma.meetingGroup.update({ where: { id: groupId }, data: { name: data.name, description: data.description ?? undefined } });
  return true;
}

// Soft delete the group (hide it; messages remain in the DB).
export async function deleteGroup(groupId: string, schoolId: string) {
  const g = await prisma.meetingGroup.findFirst({ where: { id: groupId, schoolId }, select: { id: true } });
  if (!g) return false;
  await prisma.meetingGroup.update({ where: { id: groupId }, data: { isActive: false } });
  return true;
}

// Add members. Re-activates a previously-removed member if they rejoin. Posts a
// SYSTEM message per added user.
export async function addMembers(groupId: string, schoolId: string, userIds: string[], actorId: string) {
  const g = await prisma.meetingGroup.findFirst({ where: { id: groupId, schoolId }, select: { id: true } });
  if (!g) return false;
  for (const uid of userIds) {
    const existing = await prisma.meetingGroupMember.findUnique({ where: { groupId_userId: { groupId, userId: uid } } });
    if (existing) {
      if (!existing.isActive) await prisma.meetingGroupMember.update({ where: { id: existing.id }, data: { isActive: true } });
    } else {
      await prisma.meetingGroupMember.create({ data: { groupId, userId: uid, role: "MEMBER" } });
    }
    const u = await prisma.user.findUnique({ where: { id: uid }, select: { name: true } });
    await prisma.meetingMessage.create({ data: { groupId, senderId: actorId, message: `${u?.name ?? "Someone"} was added`, messageType: "SYSTEM" } });
  }
  return true;
}

// SOFT REMOVE a member. Their messages STAY visible (the chat history is a shared
// record; deleting their messages would tear holes in everyone's conversation).
// We only flip isActive=false so they lose access and drop out of the member list.
export async function removeMember(groupId: string, schoolId: string, userId: string, actorId: string) {
  const g = await prisma.meetingGroup.findFirst({ where: { id: groupId, schoolId }, select: { id: true } });
  if (!g) return false;
  const member = await prisma.meetingGroupMember.findUnique({ where: { groupId_userId: { groupId, userId } } });
  if (!member) return false;
  await prisma.meetingGroupMember.update({ where: { id: member.id }, data: { isActive: false } });
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.meetingMessage.create({ data: { groupId, senderId: actorId, message: `${u?.name ?? "Someone"} was removed`, messageType: "SYSTEM" } });
  return true;
}

// A teacher leaving — blocked if they are the last active ADMIN.
export async function leaveGroup(groupId: string, userId: string) {
  const member = await prisma.meetingGroupMember.findFirst({ where: { groupId, userId, isActive: true } });
  if (!member) return { ok: false, error: "Not a member" };
  if (member.role === "ADMIN") {
    const admins = await prisma.meetingGroupMember.count({ where: { groupId, isActive: true, role: "ADMIN" } });
    if (admins <= 1) return { ok: false, error: "At least one admin must remain" };
  }
  await prisma.meetingGroupMember.update({ where: { id: member.id }, data: { isActive: false } });
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
  await prisma.meetingMessage.create({ data: { groupId, senderId: userId, message: `${u?.name ?? "Someone"} left`, messageType: "SYSTEM" } });
  return { ok: true };
}

// Staff (principal + active teachers) for the member picker.
export async function listStaffForPicker(schoolId: string) {
  return prisma.user.findMany({ where: { schoolId, isActive: true, role: { in: ["PRINCIPAL", "TEACHER"] } }, select: { id: true, name: true, email: true, role: true }, orderBy: { name: "asc" } });
}
