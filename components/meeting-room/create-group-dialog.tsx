// Create-group dialog (PRINCIPAL only). Name + description + a searchable staff
// list with checkboxes. The principal is auto-added as ADMIN server-side.
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Staff = { id: string; name: string; email: string; role: string };

export function CreateGroupDialog({ open, onOpenChange, currentUserId, onCreated }: { open: boolean; onOpenChange: (v: boolean) => void; currentUserId: string; onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(""); setDescription(""); setSelected(new Set()); setSearch("");
    fetch("/api/meeting-room/staff").then((r) => r.json()).then((j) => setStaff(j.staff ?? []));
  }, [open]);

  const filtered = staff.filter((s) => s.id !== currentUserId && (s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase())));

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  async function create() {
    if (!name.trim()) return toast.error("Group name required");
    setBusy(true);
    const res = await fetch("/api/meeting-room/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, memberIds: Array.from(selected) }) });
    setBusy(false);
    if (!res.ok) return toast.error("Failed to create group");
    const j = await res.json();
    toast.success("Group created");
    onOpenChange(false);
    onCreated(j.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Create group</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Group name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Primary Teachers" /></div>
          <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="space-y-1">
            <Label className="text-xs">Members ({selected.size} selected)</Label>
            <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search staff…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div className="mt-1 max-h-56 space-y-1 overflow-y-auto rounded-md border p-1">
              {filtered.map((s) => (
                <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 hover:bg-muted">
                  <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} className="h-4 w-4" />
                  <span className="text-sm">{s.name} <span className="text-xs text-muted-foreground">· {s.role.toLowerCase()}</span></span>
                </label>
              ))}
              {filtered.length === 0 && <p className="p-2 text-sm text-muted-foreground">No staff found.</p>}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={create} disabled={busy}>{busy ? "Creating…" : "Create group"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
