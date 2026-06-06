// Meeting Room shell: groups list (left) + chat (right) on desktop; on mobile
// it's one-pane-at-a-time (WhatsApp style) — list, then full-screen chat with a
// back button. The groups list re-polls so a new message bumps its group to the
// top with an updated preview + unread badge.
"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, MessagesSquare } from "lucide-react";
import { ROLES } from "@/lib/roles";
import { getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ChatView } from "@/components/meeting-room/chat-view";
import { CreateGroupDialog } from "@/components/meeting-room/create-group-dialog";
import { GroupInfoPanel } from "@/components/meeting-room/group-info-panel";

type Group = {
  id: string; name: string; description: string | null; icon: string | null; memberCount: number; unreadCount: number;
  lastMessage: { text: string; senderName: string; at: string; type: string } | null; lastActivityAt: string;
};

function ago(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function MeetingRoom({ currentUserId, role }: { currentUserId: string; role: string }) {
  const isPrincipal = role === ROLES.PRINCIPAL;
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  const loadGroups = useCallback(async () => {
    const res = await fetch("/api/meeting-room/groups");
    if (res.ok) { const j = await res.json(); setGroups(j.groups ?? []); }
  }, []);

  useEffect(() => { loadGroups(); }, [loadGroups]);
  // Light poll of the LIST (10s) so previews + unread badges stay fresh. The open
  // chat polls faster (3s) on its own.
  useEffect(() => { const id = setInterval(loadGroups, 10_000); return () => clearInterval(id); }, [loadGroups]);

  const selected = groups.find((g) => g.id === selectedId) ?? null;

  return (
    <div className="grid h-[calc(100vh-12rem)] grid-cols-1 overflow-hidden rounded-lg border md:grid-cols-[320px_1fr]">
      {/* Groups list — hidden on mobile when a chat is open */}
      <div className={cn("flex flex-col border-r", selectedId && "hidden md:flex")}>
        <div className="flex items-center justify-between border-b p-3">
          <h2 className="font-semibold">Messages</h2>
          {isPrincipal && <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="mr-1 h-4 w-4" /> New</Button>}
        </div>
        <div className="flex-1 overflow-y-auto">
          {groups.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessagesSquare className="mx-auto mb-2 h-8 w-8 opacity-40" />
              No groups yet.{isPrincipal && " Create one to start."}
            </div>
          ) : groups.map((g) => (
            <button key={g.id} onClick={() => setSelectedId(g.id)} className={cn("flex w-full items-center gap-3 border-b p-3 text-left hover:bg-muted/50", selectedId === g.id && "bg-muted")}>
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{getInitials(g.name)}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-medium">{g.name}</p>
                  {g.lastMessage && <span className="shrink-0 text-[10px] text-muted-foreground">{ago(g.lastMessage.at)}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">
                    {g.lastMessage ? (g.lastMessage.type === "SYSTEM" ? g.lastMessage.text : `${g.lastMessage.senderName}: ${g.lastMessage.text}`) : "No messages yet"}
                  </p>
                  {g.unreadCount > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{g.unreadCount}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat pane */}
      <div className={cn("min-h-0", !selectedId && "hidden md:block")}>
        {selected ? (
          <ChatView
            key={selected.id}
            group={{ id: selected.id, name: selected.name, memberCount: selected.memberCount }}
            currentUserId={currentUserId}
            onBack={() => setSelectedId(null)}
            onOpenInfo={() => setInfoOpen(true)}
            onActivity={loadGroups}
          />
        ) : (
          <div className="hidden h-full items-center justify-center text-muted-foreground md:flex">
            <div className="text-center"><MessagesSquare className="mx-auto mb-2 h-10 w-10 opacity-30" /><p>Select a group to start chatting</p></div>
          </div>
        )}
      </div>

      {isPrincipal && <CreateGroupDialog open={createOpen} onOpenChange={setCreateOpen} currentUserId={currentUserId} onCreated={(id) => { loadGroups(); setSelectedId(id); }} />}
      {selectedId && <GroupInfoPanel groupId={selectedId} open={infoOpen} onOpenChange={setInfoOpen} role={role} currentUserId={currentUserId} onChanged={loadGroups} onClosedGroup={() => { setSelectedId(null); loadGroups(); }} />}
    </div>
  );
}
