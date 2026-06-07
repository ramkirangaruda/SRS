// Holds the unread message/diary counts that drive the nav badges, and keeps
// them fresh. Since we chose POLLING over websockets (see the concept note), the
// counts stay in sync via three triggers:
//   1. a 30s interval (catches new broadcasts/diary while the tab is open),
//   2. window 'focus' (instant update when you return to the tab),
//   3. a cross-tab 'storage' ping — when you read something in ONE tab, every
//      OTHER tab refetches, so the badge drops everywhere (see badge walkthrough).
"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { UnreadCounts } from "@/lib/notifications";

type Ctx = UnreadCounts & { refresh: () => void };
const UnreadContext = createContext<Ctx>({ messages: 0, diary: 0, feedback: 0, bell: 0, refresh: () => {} });

const PING_KEY = "schoolsync-unread-ping";

export function UnreadProvider({ initial, children }: { initial: UnreadCounts; children: React.ReactNode }) {
  const [counts, setCounts] = useState<UnreadCounts>(initial);

  // Refetch the counts from the server.
  const fetchCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications/unread-count");
      if (res.ok) setCounts(await res.json());
    } catch {
      // network blip — keep the old counts
    }
  }, []);

  // Public refresh: refetch locally AND ping other tabs to refetch too.
  const refresh = useCallback(() => {
    void fetchCounts();
    try {
      localStorage.setItem(PING_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
  }, [fetchCounts]);

  useEffect(() => {
    const interval = setInterval(fetchCounts, 30_000);
    const onFocus = () => fetchCounts();
    const onStorage = (e: StorageEvent) => {
      if (e.key === PING_KEY) fetchCounts(); // another tab read something
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener("storage", onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
    };
  }, [fetchCounts]);

  return <UnreadContext.Provider value={{ ...counts, refresh }}>{children}</UnreadContext.Provider>;
}

export const useUnread = () => useContext(UnreadContext);
