// Add/Edit holiday dialog.
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HOLIDAY_TYPES } from "@/lib/holidays";
import type { HolidayItem } from "@/lib/holidays";
import { dayKey } from "@/lib/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const TYPE_LABEL: Record<string, string> = { NATIONAL: "National Holiday", FESTIVAL: "Festival", BREAK: "School Break", OTHER: "Other" };

export function HolidayForm({ open, onOpenChange, initial, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; initial?: HolidayItem; onSaved: () => void }) {
  const editing = !!initial?.id;
  const [name, setName] = useState(initial?.name ?? "");
  const [date, setDate] = useState(initial ? dayKey(initial.date) : new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(initial?.endDate ? dayKey(initial.endDate) : "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState(initial?.type ?? "OTHER");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim() || !date) { setErr("Name and date are required"); return; }
    setBusy(true); setErr(null);
    const res = await fetch(editing ? `/api/holidays/${initial!.id}` : "/api/holidays", {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, date, endDate, description, type }),
    });
    setBusy(false);
    if (!res.ok) { setErr("Failed to save"); return; }
    toast.success(editing ? "Holiday updated" : "Holiday added");
    onSaved(); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit Holiday" : "Add Holiday"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Date *</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>End date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{HOLIDAY_TYPES.map((t) => <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
