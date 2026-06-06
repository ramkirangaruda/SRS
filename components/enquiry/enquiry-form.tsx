// New / edit enquiry dialog. Creates the lead in NEW status.
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ENQUIRY_SOURCES } from "@/lib/enquiry";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Opt = { id: string; name: string };
type Enquiry = Record<string, unknown> & { id: string };

export function EnquiryForm({ open, onOpenChange, categories, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; categories: Opt[]; editing: Enquiry | null; onSaved: () => void }) {
  const [form, setForm] = useState({ parentName: "", phone: "", email: "", address: "", childName: "", childAge: "", childGender: "", currentSchool: "", classInterestedIn: "", source: "WALKIN", categoryId: "", message: "", followUpDate: "" });
  const [busy, setBusy] = useState(false);
  const NONE = "__none__";
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    if (editing) setForm({ parentName: String(editing.parentName ?? ""), phone: String(editing.phone ?? ""), email: String(editing.email ?? ""), address: String(editing.address ?? ""), childName: String(editing.childName ?? ""), childAge: String(editing.childAge ?? ""), childGender: String(editing.childGender ?? ""), currentSchool: String(editing.currentSchool ?? ""), classInterestedIn: String(editing.classInterestedIn ?? ""), source: String(editing.source ?? "WALKIN"), categoryId: String(editing.categoryId ?? ""), message: String(editing.message ?? ""), followUpDate: editing.followUpDate ? String(editing.followUpDate).slice(0, 10) : "" });
    else setForm({ parentName: "", phone: "", email: "", address: "", childName: "", childAge: "", childGender: "", currentSchool: "", classInterestedIn: "", source: "WALKIN", categoryId: "", message: "", followUpDate: "" });
  }, [open, editing]);

  async function save() {
    if (!form.parentName.trim() || !form.phone.trim()) return toast.error("Parent name and phone are required");
    setBusy(true);
    const res = await fetch(editing ? `/api/enquiry/${editing.id}` : "/api/enquiry", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setBusy(false);
    if (!res.ok) return toast.error("Save failed");
    toast.success(editing ? "Enquiry updated" : "Enquiry created");
    onOpenChange(false); onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit enquiry" : "New enquiry"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-xs font-semibold text-muted-foreground">Parent</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Name *</Label><Input value={form.parentName} onChange={(e) => set("parentName", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Phone *</Label><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Email</Label><Input value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Address</Label><Input value={form.address} onChange={(e) => set("address", e.target.value)} /></div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">Student</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Child name</Label><Input value={form.childName} onChange={(e) => set("childName", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Age / DOB</Label><Input value={form.childAge} onChange={(e) => set("childAge", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Gender</Label>
              <Select value={form.childGender || NONE} onValueChange={(v) => set("childGender", v === NONE ? "" : v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value={NONE}>—</SelectItem><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Class interested in</Label><Input value={form.classInterestedIn} onChange={(e) => set("classInterestedIn", e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Current school</Label><Input value={form.currentSchool} onChange={(e) => set("currentSchool", e.target.value)} /></div>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">Enquiry</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label className="text-xs">Source</Label>
              <Select value={form.source} onValueChange={(v) => set("source", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ENQUIRY_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Category</Label>
              <Select value={form.categoryId || NONE} onValueChange={(v) => set("categoryId", v === NONE ? "" : v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value={NONE}>—</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Follow-up date</Label><Input type="date" value={form.followUpDate} onChange={(e) => set("followUpDate", e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Notes / questions</Label><Textarea value={form.message} onChange={(e) => set("message", e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
