// Aggregates the unread counts shown as nav badges. All are index-backed COUNTs.
import { messagesUnreadCount } from "@/lib/broadcast";
import { diaryUnreadCount } from "@/lib/diary";
import { principalPendingCount, parentUnreadCount } from "@/lib/feedback";
import { unreadCount as bellUnreadCount } from "@/lib/notifications-center";
import { ROLES } from "@/lib/roles";

// `bell` = in-app notification-center unread (Phase 16). The existing message/
// diary/feedback badges are unchanged.
export type UnreadCounts = { messages: number; diary: number; feedback: number; bell: number };

export async function getUnreadCounts(user: { id: string; role: string; schoolId: string }): Promise<UnreadCounts> {
  const isParent = user.role === ROLES.PARENT;
  const isPrincipal = user.role === ROLES.PRINCIPAL;
  const [messages, diary, feedback, bell] = await Promise.all([
    messagesUnreadCount(user.id),
    isParent ? diaryUnreadCount(user.id, user.schoolId) : Promise.resolve(0),
    // Principal badge = tickets awaiting reply; parent badge = unread replies.
    isPrincipal
      ? principalPendingCount(user.schoolId)
      : isParent
        ? parentUnreadCount(user.id, user.schoolId)
        : Promise.resolve(0),
    bellUnreadCount(user.id),
  ]);
  return { messages, diary, feedback, bell };
}
