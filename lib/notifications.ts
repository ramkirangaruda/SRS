// Aggregates the unread counts shown as nav badges. Both counts are cheap
// index-backed COUNT queries (see messagesUnreadCount / diaryUnreadCount) — we
// never load the underlying messages/entries.
import { messagesUnreadCount } from "@/lib/broadcast";
import { diaryUnreadCount } from "@/lib/diary";
import { ROLES } from "@/lib/roles";

export type UnreadCounts = { messages: number; diary: number };

export async function getUnreadCounts(user: { id: string; role: string; schoolId: string }): Promise<UnreadCounts> {
  // Diary unread only applies to parents (it's scoped to their children's classes).
  const [messages, diary] = await Promise.all([
    messagesUnreadCount(user.id),
    user.role === ROLES.PARENT ? diaryUnreadCount(user.id, user.schoolId) : Promise.resolve(0),
  ]);
  return { messages, diary };
}
