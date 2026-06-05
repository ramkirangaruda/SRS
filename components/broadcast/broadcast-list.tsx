// Principal's sent-broadcasts list with infinite scroll. Each card shows the
// audience tag, sender, time, urgent badge, and a "read / total" receipt count.
"use client";

import Link from "next/link";
import { Plus, Paperclip } from "lucide-react";
import type { BroadcastListItem } from "@/lib/broadcast";
import { useInfiniteFeed, FeedSentinel } from "@/components/infinite-feed";
import { timeLabel } from "@/lib/date-group";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

function audienceTag(targetRole: string, label: string | null): string {
  if (label) return label;
  if (targetRole === "ALL") return "All users";
  if (targetRole === "PARENTS") return "All parents";
  if (targetRole === "TEACHERS") return "All teachers";
  return "Selected classes";
}

export function BroadcastList() {
  const { items, loading, hasMore, loadMore, initialized } = useInfiniteFeed<BroadcastListItem>("/api/broadcast");

  return (
    <div className="space-y-4 pb-20">
      <h1 className="text-2xl font-bold">Broadcasts</h1>

      {initialized && items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No broadcasts sent yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((b) => (
            <Link key={b.id} href={`/principal/broadcast/${b.id}`}>
              <Card className={`transition-colors hover:bg-accent ${b.urgent ? "border-red-300" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {b.urgent && <Badge variant="destructive">Urgent</Badge>}
                        <p className="font-semibold">{b.title}</p>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{b.message}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant="secondary">{audienceTag(b.targetRole, b.targetLabel)}</Badge>
                    <span>{b.sentByName ?? "—"}</span>
                    <span>· {formatDate(b.createdAt)} {timeLabel(b.createdAt)}</span>
                    {b.attachments.length > 0 && <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" />{b.attachments.length}</span>}
                    <span className="ml-auto font-medium text-foreground">{b.readCount}/{b.totalCount} read</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {loading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>}
      <FeedSentinel onVisible={loadMore} disabled={!hasMore || loading} />

      <Link
        href="/principal/broadcast/new"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-6 md:right-6"
        aria-label="New broadcast"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
