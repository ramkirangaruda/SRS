// The chat panel: message list (date-grouped, oldest→newest), smart polling for
// new messages, optimistic send, reverse-paginated history, and a scroll-to-
// bottom affordance. This is the "collaborative" part of the app — see the
// polling + optimistic notes inline.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Send, Paperclip, Info, ChevronDown, Check, CheckCheck, Trash2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { getInitials } from "@/lib/format";

type Msg = {
  id: string; message: string; messageType: string; senderId: string; senderName: string;
  fileUrl: string | null; fileName: string | null; fileType: string | null;
  isDeleted: boolean; createdAt: string; readByOthers: boolean;
  // client-only optimistic state:
  pending?: boolean; failed?: boolean;
};

type GroupLite = { id: string; name: string; memberCount: number };

// Date divider label: Today / Yesterday / "June 3, 2026".
function dividerLabel(iso: string): string {
  const d = new Date(iso); const now = new Date();
  const dayKey = (x: Date) => `${x.getFullYear()}-${x.getMonth()}-${x.getDate()}`;
  if (dayKey(d) === dayKey(now)) return "Today";
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(y)) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}
const timeLabel = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export function ChatView({ group, currentUserId, onBack, onOpenInfo, onActivity }: {
  group: GroupLite; currentUserId: string; onBack?: () => void; onOpenInfo: () => void; onActivity: () => void;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [input, setInput] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Latest message timestamp we've seen — the `since` for polling.
  const lastSeenRef = useRef<string>("");

  const isNearBottom = () => {
    const el = scrollRef.current; if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };
  const scrollToBottom = (smooth = false) => bottomRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });

  // Initial load: newest page, reversed to oldest→newest, then jump to bottom.
  useEffect(() => {
    let alive = true;
    setMessages([]); setCursor(null); setHasMore(false); lastSeenRef.current = "";
    fetch(`/api/meeting-room/groups/${group.id}/messages`).then((r) => r.json()).then((j) => {
      if (!alive) return;
      const ordered: Msg[] = (j.messages ?? []).slice().reverse();
      setMessages(ordered); setCursor(j.nextCursor ?? null); setHasMore(!!j.hasMore);
      lastSeenRef.current = ordered.length ? ordered[ordered.length - 1].createdAt : new Date().toISOString();
      requestAnimationFrame(() => scrollToBottom());
      onActivity();
    });
    return () => { alive = false; };
  }, [group.id, onActivity]);

  // SMART POLLING with the Page Visibility API.
  //
  // We DON'T use a fixed setInterval. A recursive setTimeout lets us pick the
  // next delay each tick based on document.visibilityState:
  //   • tab visible  → poll every 3s (you're watching, keep it snappy)
  //   • tab hidden   → poll every 30s (you're elsewhere; just keep unread fresh)
  //   • component unmounts → clearTimeout stops everything (no leaks, no waste)
  // This is the resource-saving win: a backgrounded tab makes 1 request / 30s
  // instead of 10, and a closed chat makes none.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    async function poll() {
      if (stopped) return;
      try {
        const since = lastSeenRef.current;
        const res = await fetch(`/api/meeting-room/groups/${group.id}/messages?since=${encodeURIComponent(since)}`);
        if (res.ok) {
          const j = await res.json();
          const incoming: Msg[] = j.messages ?? [];
          if (incoming.length) {
            const stick = isNearBottom();
            setMessages((prev) => {
              const have = new Set(prev.map((m) => m.id));
              return [...prev, ...incoming.filter((m) => !have.has(m.id))];
            });
            lastSeenRef.current = incoming[incoming.length - 1].createdAt;
            onActivity();
            if (stick) requestAnimationFrame(() => scrollToBottom(true)); else setShowScrollDown(true);
          }
        }
      } catch { /* network blip — next tick retries */ }
      const delay = document.visibilityState === "visible" ? 3000 : 30000;
      timer = setTimeout(poll, delay);
    }
    timer = setTimeout(poll, 3000);
    // Poll immediately when the tab regains focus (don't wait out a 30s delay).
    const onVis = () => { if (document.visibilityState === "visible") { if (timer) clearTimeout(timer); poll(); } };
    document.addEventListener("visibilitychange", onVis);
    return () => { stopped = true; if (timer) clearTimeout(timer); document.removeEventListener("visibilitychange", onVis); };
  }, [group.id, onActivity]);

  // Load older messages when the user scrolls to the top (reverse pagination).
  const loadOlder = useCallback(async () => {
    if (!hasMore || loadingOlder || !cursor) return;
    setLoadingOlder(true);
    const el = scrollRef.current;
    const prevHeight = el?.scrollHeight ?? 0;
    const res = await fetch(`/api/meeting-room/groups/${group.id}/messages?cursor=${encodeURIComponent(cursor)}`);
    const j = await res.json();
    const older: Msg[] = (j.messages ?? []).slice().reverse();
    setMessages((prev) => [...older, ...prev]);
    setCursor(j.nextCursor ?? null); setHasMore(!!j.hasMore);
    setLoadingOlder(false);
    // Preserve the scroll position so the view doesn't jump when we prepend.
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - prevHeight; });
  }, [hasMore, loadingOlder, cursor, group.id]);

  function onScroll() {
    const el = scrollRef.current; if (!el) return;
    if (el.scrollTop < 60) loadOlder();
    setShowScrollDown(!isNearBottom());
  }

  // OPTIMISTIC SEND: show the bubble instantly with a temp id + pending flag,
  // then reconcile when the server responds (swap on success, mark failed on error).
  async function send() {
    const text = input.trim();
    if (!text) return;
    const tempId = `temp-${Date.now()}`;
    const optimistic: Msg = { id: tempId, message: text, messageType: "TEXT", senderId: currentUserId, senderName: "You", fileUrl: null, fileName: null, fileType: null, isDeleted: false, createdAt: new Date().toISOString(), readByOthers: false, pending: true };
    setMessages((p) => [...p, optimistic]);
    setInput("");
    requestAnimationFrame(() => scrollToBottom(true));
    try {
      const res = await fetch(`/api/meeting-room/groups/${group.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: text }) });
      if (!res.ok) throw new Error();
      const saved: Msg = await res.json();
      setMessages((p) => p.map((m) => (m.id === tempId ? saved : m)));
      lastSeenRef.current = saved.createdAt;
      onActivity();
    } catch {
      // Graceful failure: keep the bubble, flag it, let the user retry.
      setMessages((p) => p.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)));
    }
  }

  async function retry(failed: Msg) {
    setMessages((p) => p.map((m) => (m.id === failed.id ? { ...m, failed: false, pending: true } : m)));
    try {
      const res = await fetch(`/api/meeting-room/groups/${group.id}/messages`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: failed.message }) });
      if (!res.ok) throw new Error();
      const saved: Msg = await res.json();
      setMessages((p) => p.map((m) => (m.id === failed.id ? saved : m)));
    } catch {
      setMessages((p) => p.map((m) => (m.id === failed.id ? { ...m, pending: false, failed: true } : m)));
    }
  }

  async function onFilePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    e.target.value = "";
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch(`/api/meeting-room/groups/${group.id}/messages/upload`, { method: "POST", body: fd });
    if (!res.ok) { toast.error("Upload failed"); return; }
    const saved: Msg = await res.json();
    setMessages((p) => [...p, saved]); lastSeenRef.current = saved.createdAt;
    requestAnimationFrame(() => scrollToBottom(true)); onActivity();
  }

  async function del(id: string) {
    const res = await fetch(`/api/meeting-room/groups/${group.id}/messages/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    setMessages((p) => p.map((m) => (m.id === id ? { ...m, isDeleted: true, message: "", fileUrl: null } : m)));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b p-3">
        {onBack && <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}><ArrowLeft className="h-5 w-5" /></Button>}
        <button onClick={onOpenInfo} className="flex flex-1 items-center gap-2 text-left">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{getInitials(group.name)}</div>
          <div><p className="font-medium leading-tight">{group.name}</p><p className="text-xs text-muted-foreground">{group.memberCount} members</p></div>
        </button>
        <Button variant="ghost" size="icon" onClick={onOpenInfo}><Info className="h-5 w-5" /></Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={onScroll} className="relative flex-1 space-y-1 overflow-y-auto bg-muted/20 p-3">
        {loadingOlder && <p className="text-center text-xs text-muted-foreground">Loading older…</p>}
        {messages.map((m, i) => {
          const showDivider = i === 0 || dividerLabel(m.createdAt) !== dividerLabel(messages[i - 1].createdAt);
          if (m.messageType === "SYSTEM") {
            return (
              <div key={m.id}>
                {showDivider && <DateDivider label={dividerLabel(m.createdAt)} />}
                <p className="my-1 text-center text-xs text-muted-foreground">{m.message}</p>
              </div>
            );
          }
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id}>
              {showDivider && <DateDivider label={dividerLabel(m.createdAt)} />}
              <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`group max-w-[78%] rounded-lg px-3 py-1.5 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-background border"}`}>
                  {!mine && <p className="text-xs font-semibold text-primary">{m.senderName}</p>}
                  {m.isDeleted ? (
                    <p className="italic opacity-70">This message was deleted</p>
                  ) : m.messageType === "FILE" && m.fileUrl ? (
                    <a href={m.fileUrl} target="_blank" className="flex items-center gap-2 underline"><FileText className="h-4 w-4" /> {m.fileName ?? "File"}</a>
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.message}</p>
                  )}
                  <div className={`mt-0.5 flex items-center justify-end gap-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    <span>{timeLabel(m.createdAt)}</span>
                    {mine && !m.isDeleted && (
                      m.failed ? <button onClick={() => retry(m)} className="font-semibold underline">retry</button>
                      : m.pending ? <Check className="h-3 w-3 opacity-50" />
                      : m.readByOthers ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                    )}
                    {mine && !m.isDeleted && !m.pending && !m.failed && (
                      <button onClick={() => del(m.id)} className="ml-1 hidden group-hover:inline"><Trash2 className="h-3 w-3" /></button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {showScrollDown && (
        <button onClick={() => { scrollToBottom(true); setShowScrollDown(false); }} className="absolute bottom-20 right-6 rounded-full bg-primary p-2 text-primary-foreground shadow-lg">
          <ChevronDown className="h-5 w-5" />
        </button>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 border-t p-3">
        <input ref={fileRef} type="file" className="hidden" onChange={onFilePick} />
        <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()}><Paperclip className="h-5 w-5" /></Button>
        <Textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder="Message… (Enter to send, Shift+Enter for newline)" rows={1} className="max-h-32 min-h-[40px] flex-1 resize-none" />
        <Button size="icon" onClick={send} disabled={!input.trim()}><Send className="h-5 w-5" /></Button>
      </div>
    </div>
  );
}

function DateDivider({ label }: { label: string }) {
  return <div className="my-2 flex justify-center"><span className="rounded-full bg-muted px-3 py-0.5 text-xs text-muted-foreground">{label}</span></div>;
}
