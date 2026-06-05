// Infinite-scroll primitives shared by the diary + message feeds.
//
// useInfiniteFeed: fetches a cursor-paginated endpoint ({ data, nextCursor }),
// appending pages. It tracks the cursor in a ref (so callbacks stay stable and
// closures never go stale) and reloads from scratch whenever the endpoint
// (i.e. the active filters) change.
//
// FeedSentinel: an empty div placed at the bottom of the list. The Intersection
// Observer API watches it; when it scrolls into view (with a 200px head start),
// it calls onVisible → loadMore. That's "infinite scroll" — no scroll math, the
// browser tells us when the bottom is near.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useInfiniteFeed<T>(endpoint: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const cursorRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const hasMoreRef = useRef(true);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMoreRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const url = new URL(endpoint, window.location.origin);
      if (cursorRef.current) url.searchParams.set("cursor", cursorRef.current);
      const res = await fetch(url.toString());
      const data = await res.json();
      setItems((prev) => [...prev, ...(data.data ?? [])]);
      cursorRef.current = data.nextCursor ?? null;
      hasMoreRef.current = !!data.nextCursor;
      setHasMore(!!data.nextCursor);
    } finally {
      loadingRef.current = false;
      setLoading(false);
      setInitialized(true);
    }
  }, [endpoint]);

  // Reset and load page 1 whenever the endpoint (filters) changes.
  useEffect(() => {
    setItems([]);
    setInitialized(false);
    cursorRef.current = null;
    hasMoreRef.current = true;
    setHasMore(true);
    void loadMore();
  }, [loadMore]);

  return { items, setItems, loading, hasMore, loadMore, initialized };
}

export function FeedSentinel({ onVisible, disabled }: { onVisible: () => void; disabled?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (disabled) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onVisible();
      },
      { rootMargin: "200px" } // start loading 200px before it's actually visible
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onVisible, disabled]);
  return <div ref={ref} className="h-1" />;
}
