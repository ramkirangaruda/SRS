// Parent/teacher inbox. Unread = blue dot + bold title. Urgent = red badge and
// floated to the top (within the loaded set). Tapping a message expands it,
// marks it read via the PATCH endpoint, and refreshes the unread badge.
"use client";

import { useMemo, useState } from "react";
import { Mail } from "lucide-react";
import type { InboxItem } from "@/lib/broadcast";
import { useInfiniteFeed, FeedSentinel } from "@/components/infinite-feed";
import { useUnread } from "@/components/unread-provider";
import { timeLabel } from "@/lib/date-group";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AttachmentList } from "@/components/homework/attachment-list";

export function MessagesInbox() {
  const { items, setItems, loading, hasMore, loadMore, initialized } = useInfiniteFeed<InboxItem>("/api/parent/messages");
  const { refresh } = useUnread();
  const [openId, setOpenId] = useState<string | null>(null);

  // Float urgent-unread messages to the top of the loaded set (best-effort).
  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const ua = a.urgent && !a.read ? 1 : 0;
      const ub = b.urgent && !b.read ? 1 : 0;
      return ub - ua; // urgent-unread first; otherwise keep server (newest) order
    });
  }, [items]);

  async function open(msg: InboxItem) {
    setOpenId(openId === msg.id ? null : msg.id);
    if (!msg.read) {
      setItems((prev) => prev.map((m) => (m.id === msg.id ? { ...m, read: true } : m)));
      await fetch(`/api/broadcast/${msg.id}/read`, { method: "PATCH" });
      refresh(); // update the nav badge (and ping other tabs)
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Messages</h1>

      {initialized && items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No messages.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((m) => (
            <Card key={m.id} onClick={() => open(m)} className="cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Mail className={`mt-0.5 h-4 w-4 shrink-0 ${m.read ? "text-muted-foreground" : "text-blue-500"}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {m.urgent && <Badge variant="destructive">Urgent</Badge>}
                      <p className={m.read ? "font-medium" : "font-bold"}>{m.title}</p>
                      {!m.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="unread" />}
                    </div>
                    {openId === m.id ? (
                      <>
                        <p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
                        {m.attachments.length > 0 && <div className="mt-3"><AttachmentList attachments={m.attachments} /></div>}
                      </>
                    ) : (
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{m.message}</p>
                    )}
                    <p className="mt-1 text-xs text-muted-foreground">
                      From {m.sentByName ?? "—"} · {formatDate(m.createdAt)} {timeLabel(m.createdAt)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {loading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>}
      <FeedSentinel onVisible={loadMore} disabled={!hasMore || loading} />
    </div>
  );
}
