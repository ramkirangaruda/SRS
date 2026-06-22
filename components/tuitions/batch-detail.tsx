// Manage one batch: see enrolled students with their fee status, enroll/remove
// students, record payments, and review recent payments. Opened from the batch
// list. Calls onChanged() after mutations so the list totals refresh too.
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, IndianRupee } from "lucide-react";
import { formatINR } from "@/lib/money";
import { feeStatusVariant, type FeeStatus } from "@/lib/fee-status";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Opt = { id: string; name: string; admissionNumber: string };
type Student = { enrollmentId: string; studentId: string; studentName: string; admissionNumber: string; className: string | null; paid: number; balance: number; status: FeeStatus };
type Payment = { id: string; amount: number; date: string; mode: string; notes: string | null; studentName: string; collectedByName: string };
type Batch = { id: string; name: string; feeAmount: number; expected: number; collected: number; pending: number };

const MODES = ["CASH", "ONLINE", "UPI", "CARD", "OTHER"];
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

export function BatchDetail({
  batchId,
  open,
  onOpenChange,
  students,
  onChanged,
}: {
  batchId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  students: Opt[];
  onChanged: () => void;
}) {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [enrolled, setEnrolled] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [addId, setAddId] = useState("");
  const [pay, setPay] = useState<Student | null>(null);
  const [remove, setRemove] = useState<Student | null>(null);

  const load = useCallback(async () => {
    if (!batchId) return;
    setLoading(true);
    const res = await fetch(`/api/tuitions/batches/${batchId}`);
    if (res.ok) {
      const j = await res.json();
      setBatch(j.batch);
      setEnrolled(j.students);
      setPayments(j.payments);
    }
    setLoading(false);
  }, [batchId]);
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Refresh both this dialog and the parent list.
  const refresh = () => { load(); onChanged(); };

  const enrolledIds = new Set(enrolled.map((e) => e.studentId));
  const addable = students.filter((s) => !enrolledIds.has(s.id));

  async function addStudent() {
    if (!addId || !batchId) return;
    const res = await fetch(`/api/tuitions/batches/${batchId}/enroll`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ studentId: addId }),
    });
    if (!res.ok) { toast.error("Could not enroll"); return; }
    toast.success("Student enrolled");
    setAddId("");
    refresh();
  }

  async function removeStudent(s: Student) {
    const res = await fetch(`/api/tuitions/enrollments/${s.enrollmentId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Could not remove"); return; }
    toast.success("Removed from batch");
    setRemove(null);
    refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{batch?.name ?? "Batch"}</DialogTitle>
        </DialogHeader>

        {loading && !batch ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="space-y-4">
            {batch && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="Fee / student" value={formatINR(batch.feeAmount)} />
                <Stat label="Collected" value={formatINR(batch.collected)} />
                <Stat label="Pending" value={formatINR(batch.pending)} />
              </div>
            )}

            {/* Enroll a student */}
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                <Label className="text-xs">Enroll a student</Label>
                <Select value={addId} onValueChange={setAddId}>
                  <SelectTrigger><SelectValue placeholder={addable.length ? "Choose student…" : "All students enrolled"} /></SelectTrigger>
                  <SelectContent>
                    {addable.map((s) => <SelectItem key={s.id} value={s.id}>{s.name} ({s.admissionNumber})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addStudent} disabled={!addId}><Plus className="mr-1 h-4 w-4" /> Add</Button>
            </div>

            {/* Enrolled students */}
            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">Enrolled ({enrolled.length})</p>
              {enrolled.length === 0 ? (
                <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
              ) : (
                <div className="space-y-2">
                  {enrolled.map((s) => (
                    <div key={s.enrollmentId} className="flex items-center gap-2 rounded-md border p-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{s.studentName} <span className="text-xs font-normal text-muted-foreground">{s.admissionNumber}{s.className ? ` · ${s.className}` : ""}</span></p>
                        <p className="text-xs text-muted-foreground">Paid {formatINR(s.paid)} · Balance {formatINR(s.balance)}</p>
                      </div>
                      <Badge variant={feeStatusVariant(s.status)}>{s.status}</Badge>
                      <Button size="sm" variant="outline" onClick={() => setPay(s)}><IndianRupee className="mr-1 h-3 w-3" /> Pay</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setRemove(s)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent payments */}
            {payments.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Recent payments</p>
                <div className="space-y-1">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
                      <span className="min-w-0 truncate">{p.studentName} · <span className="text-muted-foreground">{p.mode}</span></span>
                      <span className="shrink-0 text-right"><span className="font-medium">{formatINR(p.amount)}</span> <span className="text-xs text-muted-foreground">{fmtDate(p.date)}</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {pay && batchId && (
          <PayDialog
            batchId={batchId}
            student={pay}
            onClose={() => setPay(null)}
            onPaid={() => { setPay(null); refresh(); }}
          />
        )}
        <ConfirmDialog
          open={!!remove}
          onOpenChange={(v) => !v && setRemove(null)}
          title={`Remove ${remove?.studentName} from this batch?`}
          description="Their payment history is kept, but they'll no longer be enrolled."
          confirmLabel="Remove"
          onConfirm={() => { if (remove) removeStudent(remove); }}
        />
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border p-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-bold">{value}</p>
    </div>
  );
}

function PayDialog({ batchId, student, onClose, onPaid }: { batchId: string; student: Student; onClose: () => void; onPaid: () => void }) {
  const [amount, setAmount] = useState(student.balance > 0 ? String(student.balance / 100) : "");
  const [mode, setMode] = useState("CASH");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error("Enter a valid amount");
    setBusy(true);
    const res = await fetch("/api/tuitions/payments", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId, studentId: student.studentId, amount, mode, notes }),
    });
    setBusy(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); return toast.error(j.error ?? "Payment failed"); }
    toast.success("Payment recorded");
    onPaid();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Record payment · {student.studentName}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Balance: {formatINR(student.balance)}</p>
          <div className="space-y-1">
            <Label className="text-xs">Amount (₹)</Label>
            <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MODES.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>{busy ? "Saving…" : "Record"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
