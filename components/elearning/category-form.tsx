"use client";
import { useState } from "react";
import { toast } from "sonner";
import { CATEGORY_ICONS, CATEGORY_COLORS, CategoryIcon } from "@/components/elearning/category-icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CategoryForm({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("globe");
  const [color, setColor] = useState(CATEGORY_COLORS[4]);

  async function save() {
    if (!name.trim()) return toast.error("Name required");
    const res = await fetch("/api/elearning/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description, icon, color }) });
    if (!res.ok) return toast.error("Failed");
    toast.success("Category added"); onSaved(); onOpenChange(false); setName(""); setDescription("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Icon</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ICONS.map((i) => (
                <button key={i.key} type="button" onClick={() => setIcon(i.key)} className={`flex h-9 w-9 items-center justify-center rounded-md border ${icon === i.key ? "border-primary bg-accent" : ""}`} title={i.label}>
                  <CategoryIcon icon={i.key} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_COLORS.map((c) => <button key={c} type="button" onClick={() => setColor(c)} style={{ background: c }} className={`h-7 w-7 rounded-full ${color === c ? "ring-2 ring-offset-2 ring-ring" : ""}`} />)}
            </div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save}>Add</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
