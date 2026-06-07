// Notification bell + dropdown (in-app notification center). Polls the unread
// count (reusing the UnreadProvider's `bell`), and lazily loads the list when
// opened. Clicking a notification marks it read and deep-links to its URL.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { useUnread } from "@/components/unread-provider";
import { timeAgo } from "@/lib/relative-time";
import { cn } from "@/lib/utils";

type Note = { id: string; title: string; body: string; url: string | null; type: string; isRead: boolean; createdAt: string };

export function NotificationBell() {
  const router = useRouter();
  const { bell, refresh } = useUnread();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function openPanel() {
    setOpen((v) => !v);
    if (!open) {
      const res = await fetch("/api/notifications");
      if (res.ok) setNotes((await res.json()).notifications);
    }
  }

  async function clickNote(n: Note) {
    if (!n.isRead) { await fetch("/api/notifications/read", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) }); refresh(); }
    setOpen(false);
    if (n.url) router.push(n.url);
  }

  async function markAll() {
    await fetch("/api/notifications/read", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: "{}" });
    setNotes((p) => p.map((n) => ({ ...n, isRead: true }))); refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={openPanel} aria-label="Notifications" className="relative rounded-md p-2 hover:bg-muted">
        <Bell className="h-5 w-5" />
        {bell > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{bell > 9 ? "9+" : bell}</span>}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[90vw] rounded-md border bg-background shadow-lg">
          <div className="flex items-center justify-between border-b p-2">
            <span className="text-sm font-semibold">Notifications</span>
            <button onClick={markAll} className="flex items-center gap-1 text-xs text-blue-600 hover:underline"><CheckCheck className="h-3 w-3" /> Mark all read</button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notes.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">No notifications.</p>
            ) : notes.map((n) => (
              <button key={n.id} onClick={() => clickNote(n)} className={cn("flex w-full flex-col items-start border-b p-3 text-left hover:bg-muted/50", !n.isRead && "bg-primary/5")}>
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-medium">{n.title}</span>
                  {!n.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />}
                </span>
                <span className="text-xs text-muted-foreground">{n.body}</span>
                <span className="mt-0.5 text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
