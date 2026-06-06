// Group info slide-over: name/description (editable by principal), member list
// with add/remove (principal), Leave (anyone), Delete (principal). Role-aware.
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { UserPlus, UserMinus, LogOut, Trash2, Pencil, Check } from "lucide-react";
import { ROLES } from "@/lib/roles";
import { getInitials, formatDate } from "@/lib/format";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type Member = { id: string; name: string; email: string; role: string };
type Info = { id: string; name: string; description: string | null; createdAt: string; members: Member[] };
type Staff = { id: string; name: string; email: string; role: string };

export function GroupInfoPanel({ groupId, open, onOpenChange, role, currentUserId, onChanged, onClosedGroup }: {
  groupId: string; open: boolean; onOpenChange: (v: boolean) => void; role: string; currentUserId: string; onChanged: () => void; onClosedGroup: () => void;
}) {
  const isPrincipal = role === ROLES.PRINCIPAL;
  const [info, setInfo] = useState<Info | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = () => fetch(`/api/meeting-room/groups/${groupId}`).then((r) => r.json()).then((j) => { setInfo(j); setName(j.name); setDescription(j.description ?? ""); });
  useEffect(() => { if (open) load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [open, groupId]);

  async function saveEdit() {
    const res = await fetch(`/api/meeting-room/groups/${groupId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description }) });
    if (!res.ok) return toast.error("Update failed");
    setEditing(false); load(); onChanged(); toast.success("Group updated");
  }
  async function removeMember(userId: string) {
    const res = await fetch(`/api/meeting-room/groups/${groupId}/members/${userId}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Remove failed");
    load(); toast.success("Member removed");
  }
  async function del() {
    const res = await fetch(`/api/meeting-room/groups/${groupId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    toast.success("Group deleted"); onOpenChange(false); onClosedGroup();
  }
  async function leave() {
    const res = await fetch(`/api/meeting-room/groups/${groupId}/leave`, { method: "POST" });
    if (res.status === 409) { const j = await res.json(); toast.error(j.error); return; }
    if (!res.ok) { toast.error("Leave failed"); return; }
    toast.success("Left group"); onOpenChange(false); onClosedGroup();
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader><SheetTitle>Group info</SheetTitle></SheetHeader>
        {!info ? <p className="mt-4 text-sm text-muted-foreground">Loading…</p> : (
          <div className="mt-4 space-y-5">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">{getInitials(info.name)}</div>
              {editing ? (
                <div className="w-full space-y-2">
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                  <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" />
                  <Button size="sm" onClick={saveEdit}><Check className="mr-1 h-4 w-4" /> Save</Button>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-semibold">{info.name} {isPrincipal && <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditing(true)}><Pencil className="h-3 w-3" /></Button>}</p>
                  {info.description && <p className="text-sm text-muted-foreground">{info.description}</p>}
                  <p className="text-xs text-muted-foreground">Created {formatDate(info.createdAt)}</p>
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">{info.members.length} members</p>
                {isPrincipal && <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}><UserPlus className="mr-1 h-4 w-4" /> Add</Button>}
              </div>
              <ul className="space-y-1">
                {info.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted">
                    <span className="flex items-center gap-2 text-sm">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs">{getInitials(m.name)}</span>
                      {m.name} {m.role === "ADMIN" && <Badge variant="secondary">Admin</Badge>}
                    </span>
                    {isPrincipal && m.id !== currentUserId && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeMember(m.id)}><UserMinus className="h-4 w-4" /></Button>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2 border-t pt-4">
              <Button variant="outline" className="text-destructive" onClick={() => setConfirmLeave(true)}><LogOut className="mr-1 h-4 w-4" /> Leave group</Button>
              {isPrincipal && <Button variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="mr-1 h-4 w-4" /> Delete group</Button>}
            </div>
          </div>
        )}

        <AddMembersDialog groupId={groupId} open={addOpen} onOpenChange={setAddOpen} existing={info?.members.map((m) => m.id) ?? []} onAdded={() => { load(); onChanged(); }} />
        <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this group?" description="The group is hidden for everyone. Messages remain in the database." confirmLabel="Delete" onConfirm={del} />
        <ConfirmDialog open={confirmLeave} onOpenChange={setConfirmLeave} title="Leave this group?" description="You'll stop receiving messages. Your past messages stay visible to others." confirmLabel="Leave" onConfirm={leave} />
      </SheetContent>
    </Sheet>
  );
}

function AddMembersDialog({ groupId, open, onOpenChange, existing, onAdded }: { groupId: string; open: boolean; onOpenChange: (v: boolean) => void; existing: string[]; onAdded: () => void }) {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  useEffect(() => { if (open) { setSelected(new Set()); fetch("/api/meeting-room/staff").then((r) => r.json()).then((j) => setStaff(j.staff ?? [])); } }, [open]);
  const candidates = staff.filter((s) => !existing.includes(s.id));

  async function add() {
    if (selected.size === 0) return;
    const res = await fetch(`/api/meeting-room/groups/${groupId}/members`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userIds: Array.from(selected) }) });
    if (!res.ok) return toast.error("Add failed");
    toast.success("Members added"); onOpenChange(false); onAdded();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add members</DialogTitle></DialogHeader>
        <div className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-1">
          {candidates.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => setSelected((p) => { const n = new Set(p); n.has(s.id) ? n.delete(s.id) : n.add(s.id); return n; })} className="h-4 w-4" />
              <span className="text-sm">{s.name}</span>
            </label>
          ))}
          {candidates.length === 0 && <p className="p-2 text-sm text-muted-foreground">Everyone is already a member.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={add} disabled={selected.size === 0}>Add ({selected.size})</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
