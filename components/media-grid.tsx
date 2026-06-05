// MediaGrid — a reusable grid used by Gallery, Videos, and Tutorials. It enforces
// consistent responsive columns, infinite-scroll, and skeleton loading; callers
// supply `items` + a `renderCard` render prop. The column layout is passed via
// `className` (a CSS grid or masonry `columns-*`), so the same component does a
// 4-col masonry for photos and a 3-col grid for categories.
"use client";

import { FeedSentinel } from "@/components/infinite-feed";
import { Skeleton } from "@/components/ui/skeleton";

export function MediaGrid<T>({
  items,
  renderCard,
  className = "grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4",
  loading = false,
  hasMore = false,
  onLoadMore,
  emptyText = "Nothing here yet.",
  skeletonCount = 8,
}: {
  items: T[];
  renderCard: (item: T, index: number) => React.ReactNode;
  className?: string;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
  emptyText?: string;
  skeletonCount?: number;
}) {
  const showEmpty = !loading && items.length === 0;

  return (
    <div className="space-y-3">
      <div className={className}>
        {items.map((it, i) => renderCard(it, i))}
        {/* Skeleton placeholders while the first page (or next page) loads. */}
        {loading && items.length === 0 && Array.from({ length: skeletonCount }).map((_, i) => <Skeleton key={`s${i}`} className="mb-3 h-40 w-full rounded-lg" />)}
      </div>

      {showEmpty && <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">{emptyText}</p>}

      {loading && items.length > 0 && <p className="text-center text-sm text-muted-foreground">Loading…</p>}

      {/* Intersection-Observer sentinel: when it nears the viewport, load more. */}
      {onLoadMore && <FeedSentinel onVisible={onLoadMore} disabled={!hasMore || loading} />}
    </div>
  );
}
