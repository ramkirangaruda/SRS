// In-app notification center data layer (the bell). Distinct from lib/push.ts
// (delivery) — this is the read/list/mark-read side.
import { prisma } from "@/lib/prisma";

export async function listNotifications(userId: string, page = 1) {
  const pageSize = 20;
  const [rows, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return {
    unread,
    notifications: rows.map((n) => ({ id: n.id, title: n.title, body: n.body, url: n.url, type: n.type, isRead: n.isRead, createdAt: n.createdAt.toISOString() })),
  };
}

export async function unreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

// Mark one (by id) or ALL as read.
export async function markRead(userId: string, id?: string) {
  if (id) await prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } });
  else await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
  return unreadCount(userId);
}
