// Check-in / edit a visitor. Quick + minimal (the receptionist may be in a hurry).
// Check-in time defaults to now but is editable — for late-logged arrivals.
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PURPOSES, ID_PROOF_TYPES } from "@/lib/visitors";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Opt = { id: string; name: string };
type Visitor = { id: string; name: string; phone: string; purpose: string; purposeOther: string | null; visitingWhomId: string | null; checkInTime: string; idProofType: string | null; idNumber: string | null; notes: string | null };

// ISO → "YYYY-MM-DDTHH:MM" local for datetime-local input.
function toLocal(iso: string) { const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; }
const nowLocal = () => toLocal(new Date().toISOString());

export function VisitorForm({ open, onOpenChange, hosts, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; hosts: Opt[]; editing: Visitor | null; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", phone: "", purpose: "PARENT_VISIT", purposeOther: "", visitingWhomId: "", checkInTime: nowLocal(), idProofType: "AADHAAR", idNumber: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const NONE = "__none__";
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    if (editing) setForm({ name: editing.name, phone: editing.phone, purpose: editing.purpose, purposeOther: editing.purposeOther ?? "", visitingWhomId: editing.visitingWhomId ?? "", checkInTime: toLocal(editing.checkInTime), idProofType: editing.idProofType ?? "AADHAAR", idNumber: editing.idNumber ?? "", notes: editing.notes ?? "" });
    else setForm({ name: "", phone: "", purpose: "PARENT_VISIT", purposeOther: "", visitingWhomId: "", checkInTime: nowLocal(), idProofType: "AADHAAR", idNumber: "", notes: "" });
  }, [open, editing]);

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!/^\d{10}$/.test(form.phone)) return toast.error("Enter a 10-digit phone number");
    setBusy(true);
    const payload = { ...form, checkInTime: form.checkInTime ? new Date(form.checkInTime).toISOString() : "" };
    const res = await fetch(editing ? `/api/visitors/${editing.id}` : "/api/visitors", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setBusy(false);
    if (!res.ok) return toast.error("Save failed");
    toast.success(editing ? "Visitor updated" : "Visitor checked in");
    onOpenChange(false); onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit visitor" : "New visitor"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus /></div>
            <div className="space-y-1"><Label className="text-xs">Phone * (10 digits)</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} inputMode="numeric" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Purpose</Label>
              <Select value={form.purpose} onValueChange={(v) => set("purpose", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PURPOSES.map((p) => <SelectItem key={p} value={p}>{p.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Visiting whom</Label>
              <Select value={form.visitingWhomId || NONE} onValueChange={(v) => set("visitingWhomId", v === NONE ? "" : v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value={NONE}>—</SelectItem>{hosts.map((h) => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          {form.purpose === "OTHER" && <div className="space-y-1"><Label className="text-xs">Purpose (specify)</Label><Input value={form.purposeOther} onChange={(e) => set("purposeOther", e.target.value)} /></div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">ID proof</Label>
              <Select value={form.idProofType} onValueChange={(v) => set("idProofType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ID_PROOF_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">ID number</Label><Input value={form.idNumber} onChange={(e) => set("idNumber", e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Check-in time</Label><Input type="datetime-local" value={form.checkInTime} onChange={(e) => set("checkInTime", e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : editing ? "Save" : "Check in"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
