// Manage enquiry categories (add / rename / delete).
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Check, Pencil } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Opt = { id: string; name: string };

export function CategoriesDialog({ open, onOpenChange, initial, onChanged }: { open: boolean; onOpenChange: (v: boolean) => void; initial: Opt[]; onChanged: (c: Opt[]) => void }) {
  const [cats, setCats] = useState<Opt[]>(initial);
  const [newName, setNewName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function refresh() {
    const res = await fetch("/api/enquiry/categories");
    const j = await res.json();
    setCats(j.categories); onChanged(j.categories);
  }
  async function add() {
    if (!newName.trim()) return;
    const res = await fetch("/api/enquiry/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: newName }) });
    if (!res.ok) { toast.error("Add failed"); return; }
    setNewName(""); refresh();
  }
  async function save(id: string) {
    const res = await fetch(`/api/enquiry/categories/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName }) });
    if (!res.ok) { toast.error("Update failed"); return; }
    setEditId(null); refresh();
  }
  async function del(id: string) {
    const res = await fetch(`/api/enquiry/categories/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Enquiry categories</DialogTitle></DialogHeader>
        <div className="space-y-2">
          {cats.map((c) => (
            <div key={c.id} className="flex items-center gap-2">
              {editId === c.id ? (
                <>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" />
                  <Button size="icon" variant="ghost" onClick={() => save(c.id)}><Check className="h-4 w-4" /></Button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm">{c.name}</span>
                  <Button size="icon" variant="ghost" onClick={() => { setEditId(c.id); setEditName(c.name); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => del(c.id)}><Trash2 className="h-4 w-4" /></Button>
                </>
              )}
            </div>
          ))}
          {cats.length === 0 && <p className="text-sm text-muted-foreground">No categories yet.</p>}
          <div className="flex items-center gap-2 border-t pt-2">
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New category" className="flex-1" onKeyDown={(e) => e.key === "Enter" && add()} />
            <Button size="icon" onClick={add}><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
