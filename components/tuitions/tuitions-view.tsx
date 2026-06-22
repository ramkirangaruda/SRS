// Staff (principal/teacher) tuitions manager: list of batches with totals, create
// / edit a batch, and open a batch to manage its students + payments.
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Users, GraduationCap } from "lucide-react";
import { formatINR, fromMinor } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { BatchDetail } from "@/components/tuitions/batch-detail";

type Opt = { id: string; name: string };
type StudentOpt = { id: string; name: string; admissionNumber: string };
type Batch = {
  id: string; name: string; subject: string | null; feeAmount: number; schedule: string | null;
  isActive: boolean; tutorId: string | null; tutorName: string | null;
  studentCount: number; expected: number; collected: number; pending: number;
};

export function TuitionsView({ tutors, students }: { tutors: Opt[]; students: StudentOpt[] }) {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [del, setDel] = useState<Batch | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/tuitions/batches");
    if (res.ok) setBatches((await res.json()).batches);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function remove(b: Batch) {
    const res = await fetch(`/api/tuitions/batches/${b.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    toast.success("Batch deleted");
    setDel(null);
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> New Batch
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : batches.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
            <GraduationCap className="h-8 w-8" />
            <p className="text-sm">No tuition batches yet. Create your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {batches.map((b) => (
            <Card key={b.id} className={b.isActive ? "" : "opacity-60"}>
              <CardContent className="space-y-2 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium leading-tight">{b.name}{!b.isActive && <Badge variant="secondary" className="ml-2">Inactive</Badge>}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[b.subject, b.schedule, b.tutorName ? `Tutor: ${b.tutorName}` : null].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(b); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDel(b)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-3.5 w-3.5" /> {b.studentCount} · {formatINR(b.feeAmount)}/student</span>
                  <span className="text-muted-foreground">Collected <strong className="text-foreground">{formatINR(b.collected)}</strong> · Pending <strong className="text-foreground">{formatINR(b.pending)}</strong></span>
                </div>
                <Button size="sm" variant="outline" className="w-full" onClick={() => setDetailId(b.id)}>Manage students & fees</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <BatchForm open={formOpen} onOpenChange={setFormOpen} tutors={tutors} editing={editing} onSaved={load} />
      <BatchDetail batchId={detailId} open={!!detailId} onOpenChange={(v) => !v && setDetailId(null)} students={students} onChanged={load} />
      <ConfirmDialog
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title={`Delete ${del?.name}?`}
        description="This deletes the batch along with its enrollments and payment records. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (del) remove(del); }}
      />
    </div>
  );
}

const NONE = "__none__";

function BatchForm({ open, onOpenChange, tutors, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; tutors: Opt[]; editing: Batch | null; onSaved: () => void }) {
  const empty = { name: "", subject: "", feeAmount: "", schedule: "", tutorId: "", isActive: true };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name, subject: editing.subject ?? "", feeAmount: editing.feeAmount ? String(fromMinor(editing.feeAmount)) : "",
        schedule: editing.schedule ?? "", tutorId: editing.tutorId ?? "", isActive: editing.isActive,
      });
    } else setForm(empty);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    setBusy(true);
    const res = await fetch(editing ? `/api/tuitions/batches/${editing.id}` : "/api/tuitions/batches", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, feeAmount: form.feeAmount || 0 }),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Save failed");
    toast.success(editing ? "Batch updated" : "Batch created");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit batch" : "New batch"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Maths · Grade 5 · Evening" maxLength={120} autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Subject</Label>
              <Input value={form.subject} onChange={(e) => set("subject", e.target.value)} maxLength={80} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fee per student (₹)</Label>
              <Input inputMode="decimal" value={form.feeAmount} onChange={(e) => set("feeAmount", e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Schedule</Label>
            <Input value={form.schedule} onChange={(e) => set("schedule", e.target.value)} placeholder="Mon/Wed/Fri 5–6pm" maxLength={200} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Tutor</Label>
            <Select value={form.tutorId || NONE} onValueChange={(v) => set("tutorId", v === NONE ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>— (none)</SelectItem>
                {tutors.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} /> Active
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : editing ? "Save" : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
