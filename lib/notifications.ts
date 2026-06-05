// Aggregates the unread counts shown as nav badges. All are index-backed COUNTs.
import { messagesUnreadCount } from "@/lib/broadcast";
import { diaryUnreadCount } from "@/lib/diary";
import { principalPendingCount, parentUnreadCount } from "@/lib/feedback";
import { ROLES } from "@/lib/roles";

export type UnreadCounts = { messages: number; diary: number; feedback: number };

export async function getUnreadCounts(user: { id: string; role: string; schoolId: string }): Promise<UnreadCounts> {
  const isParent = user.role === ROLES.PARENT;
  const isPrincipal = user.role === ROLES.PRINCIPAL;
  const [messages, diary, feedback] = await Promise.all([
    messagesUnreadCount(user.id),
    isParent ? diaryUnreadCount(user.id, user.schoolId) : Promise.resolve(0),
    // Principal badge = tickets awaiting reply; parent badge = unread replies.
    isPrincipal
      ? principalPendingCount(user.schoolId)
      : isParent
        ? parentUnreadCount(user.id, user.schoolId)
        : Promise.resolve(0),
  ]);
  return { messages, diary, feedback };
}
