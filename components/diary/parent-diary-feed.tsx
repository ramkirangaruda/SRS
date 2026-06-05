// Parent diary feed: a clean read-only feed of entries for the parent's
// children's classes, with a child switcher, full content, teacher avatar,
// downloadable attachments, an unread dot, and infinite scroll.
//
// READ TRACKING choice: we use a server-side table (DiaryRead) rather than
// localStorage, because a parent may read on their phone and we want the dot
// gone on their laptop too — read status must SYNC across devices. localStorage
// would be simpler but device-local. Tapping an unread entry calls the PATCH
// endpoint and clears its dot.
"use client";

import { useMemo, useState } from "react";
import type { DiaryItem } from "@/lib/diary";
import { useInfiniteFeed, FeedSentinel } from "@/components/infinite-feed";
import { dateHeader, dayGroupKey, timeLabel } from "@/lib/date-group";
import { getInitials } from "@/lib/format";
import { AttachmentList } from "@/components/homework/attachment-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useUnread } from "@/components/unread-provider";

type ChildOption = { id: string; name: string; className: string | null };

export function ParentDiaryFeed({ children }: { children: ChildOption[] }) {
  const [childId, setChildId] = useState(""); // "" = all children
  const { refresh } = useUnread();

  const endpoint = useMemo(() => {
    const p = new URLSearchParams();
    if (childId) p.set("childId", childId);
    return `/api/parent/diary?${p.toString()}`;
  }, [childId]);

  const { items, setItems, loading, hasMore, loadMore, initialized } = useInfiniteFeed<DiaryItem>(endpoint);

  const groups = useMemo(() => {
    const out: { key: string; header: string; items: DiaryItem[] }[] = [];
    for (const it of items) {
      const key = dayGroupKey(it.date);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(it);
      else out.push({ key, header: dateHeader(it.date), items: [it] });
    }
    return out;
  }, [items]);

  async function markRead(entry: DiaryItem) {
    if (entry.read) return;
    // Optimistically clear the dot, then persist + refresh the nav badge.
    setItems((prev) => prev.map((i) => (i.id === entry.id ? { ...i, read: true } : i)));
    await fetch(`/api/parent/diary/${entry.id}/read`, { method: "PATCH" });
    refresh();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">School Diary</h1>

      {/* Child switcher (only if more than one child) */}
      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setChildId("")}
            className={`rounded-full border px-3 py-1 text-sm ${childId === "" ? "bg-primary text-primary-foreground" : "bg-background"}`}
          >
            All
          </button>
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setChildId(c.id)}
              className={`rounded-full border px-3 py-1 text-sm ${childId === c.id ? "bg-primary text-primary-foreground" : "bg-background"}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {initialized && items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No diary entries yet.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{g.header}</h2>
              <div className="space-y-3">
                {g.items.map((entry) => (
                  <Card key={entry.id} onClick={() => markRead(entry)} className="cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {entry.postedByPhoto ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={entry.postedByPhoto} alt={entry.postedByName ?? ""} className="h-9 w-9 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                            {getInitials(entry.postedByName ?? "?")}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={`font-semibold ${!entry.read ? "" : "font-medium"}`}>{entry.title}</p>
                            {/* unread dot */}
                            {!entry.read && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-label="unread" />}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {entry.postedByName ?? "—"} · {timeLabel(entry.createdAt)} · Class {entry.className ?? "—"}
                            {entry.sectionName ? ` · ${entry.sectionName}` : ""}
                          </p>
                          <p className="mt-2 whitespace-pre-wrap text-sm">{entry.content}</p>
                          {entry.attachments.length > 0 && (
                            <div className="mt-3">
                              <AttachmentList attachments={entry.attachments} />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {loading && (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      )}
      <FeedSentinel onVisible={loadMore} disabled={!hasMore || loading} />
    </div>
  );
}
