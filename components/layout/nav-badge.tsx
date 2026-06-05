// Maps a nav item's href to the relevant unread count, and renders the little
// count pill. Diary items show the diary count; Messages items show the message
// count. Everything else shows nothing.
import type { UnreadCounts } from "@/lib/notifications";

export function unreadForHref(href: string, counts: UnreadCounts): number {
  if (href.includes("/messages")) return counts.messages;
  if (href.includes("/diary")) return counts.diary;
  return 0;
}

export function NavBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
