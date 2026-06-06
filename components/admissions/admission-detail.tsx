// Application detail: all sections + documents + Approve / Reject / Request-info +
// activity timeline. Approve assigns class/section + a generated admission number,
// then reveals the new number and (for a new parent) one-time login credentials.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Info, FileText, GitBranch, Copy, CheckCircle2 } from "lucide-react";
import type { ClassWithSections } from "@/lib/students";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Doc = { name: string; type: string; url: string };
type Activity = { id: string; activityType: string; note: string | null; performedByName: string | null; createdAt: string };
type Admission = {
  id: string; studentName: string; dateOfBirth: string | null; gender: string | null; bloodGroup: string | null; previousSchool: string | null;
  classAppliedFor: string; parentName: string; motherName: string | null; phone: string; email: string | null; address: string | null; occupation: string | null;
  documents: Doc[]; source: string; status: string; notes: string | null; enquiryId: string | null;
  assignedAdmissionNumber: string | null; assignedClassName: string | null; assignedSectionName: string | null; rejectionReason: string | null;
  createdAt: string; activities: Activity[];
};

const statusVariant = (s: string) => (s === "APPROVED" ? "success" : s === "REJECTED" ? "destructive" : "secondary");

export function AdmissionDetail({ admission, classes }: { admission: Admission; classes: ClassWithSections[] }) {
  const router = useRouter();
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{admission.studentName}</h1>
          <p className="text-muted-foreground">Class {admission.classAppliedFor} · {admission.source === "ENQUIRY" ? "From enquiry" : admission.source}</p>
        </div>
        <Badge variant={statusVariant(admission.status)}>{admission.status}</Badge>
      </div>

      {admission.status === "PENDING" && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setApproveOpen(true)}><Check className="mr-1 h-4 w-4" /> Approve</Button>
          <Button variant="outline" className="text-destructive" onClick={() => setRejectOpen(true)}><X className="mr-1 h-4 w-4" /> Reject</Button>
          <Button variant="outline" onClick={() => setInfoOpen(true)}><Info className="mr-1 h-4 w-4" /> Request More Info</Button>
          {admission.enquiryId && <Button variant="outline" asChild><a href={`/principal/enquiry/${admission.enquiryId}`}><GitBranch className="mr-1 h-4 w-4" /> View original enquiry</a></Button>}
        </div>
      )}
      {admission.status === "APPROVED" && <Card className="border-emerald-300 bg-emerald-50"><CardContent className="p-3 text-sm text-emerald-800">Approved · Admission No <strong>{admission.assignedAdmissionNumber}</strong> · {admission.assignedClassName}{admission.assignedSectionName ? `-${admission.assignedSectionName}` : ""}</CardContent></Card>}
      {admission.status === "REJECTED" && <Card className="border-red-300 bg-red-50"><CardContent className="p-3 text-sm text-red-800">Rejected — {admission.rejectionReason}</CardContent></Card>}

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-lg">Student</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">
          <Row label="Name" value={admission.studentName} />
          <Row label="DOB" value={admission.dateOfBirth ? formatDate(admission.dateOfBirth) : "—"} />
          <Row label="Gender" value={admission.gender ?? "—"} />
          <Row label="Blood group" value={admission.bloodGroup ?? "—"} />
          <Row label="Previous school" value={admission.previousSchool ?? "—"} />
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-lg">Parent</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">
          <Row label="Father" value={admission.parentName} />
          <Row label="Mother" value={admission.motherName ?? "—"} />
          <Row label="Phone" value={admission.phone} />
          <Row label="Email" value={admission.email ?? "—"} />
          <Row label="Occupation" value={admission.occupation ?? "—"} />
          <Row label="Address" value={admission.address ?? "—"} />
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-lg">Documents</CardTitle></CardHeader><CardContent>
        {admission.documents.length === 0 ? <p className="text-sm text-muted-foreground">No documents uploaded.</p> : (
          <ul className="space-y-1">{admission.documents.map((d, i) => <li key={i}><a href={d.url} target="_blank" className="flex items-center gap-2 text-sm text-blue-600 hover:underline"><FileText className="h-4 w-4" /> {d.name}</a></li>)}</ul>
        )}
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-lg">Activity timeline</CardTitle></CardHeader><CardContent>
        {admission.activities.length === 0 ? <p className="text-sm text-muted-foreground">No activity.</p> : (
          <ul className="space-y-2">{admission.activities.map((a) => (
            <li key={a.id} className="text-sm"><span className="font-medium">{a.activityType.replace(/_/g, " ")}</span>{a.note ? ` — ${a.note}` : ""}<span className="block text-xs text-muted-foreground">{a.performedByName ?? "—"} · {new Date(a.createdAt).toLocaleString()}</span></li>
          ))}</ul>
        )}
      </CardContent></Card>

      <ApproveDialog admission={admission} classes={classes} open={approveOpen} onOpenChange={setApproveOpen} onDone={() => router.refresh()} />
      <RejectDialog admissionId={admission.id} open={rejectOpen} onOpenChange={setRejectOpen} onDone={() => router.refresh()} />
      <InfoDialog admissionId={admission.id} open={infoOpen} onOpenChange={setInfoOpen} onDone={() => router.refresh()} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

function ApproveDialog({ admission, classes, open, onOpenChange, onDone }: { admission: Admission; classes: ClassWithSections[]; open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [nextNumber, setNextNumber] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ admissionNumber: string; parentEmail: string; tempPassword: string | null } | null>(null);
  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  useEffect(() => {
    if (!open) { setResult(null); setClassId(""); setSectionId(""); return; }
    // Pre-select a class matching the applied-for label, and preview the number.
    const match = classes.find((c) => c.name === admission.classAppliedFor);
    if (match) setClassId(match.id);
    fetch("/api/admissions/next-number").then((r) => r.json()).then((j) => setNextNumber(j.next));
  }, [open, classes, admission.classAppliedFor]);

  async function approve() {
    if (!classId) { toast.error("Select a class"); return; }
    setBusy(true);
    const res = await fetch(`/api/admissions/${admission.id}/approve`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId, sectionId: sectionId || "" }) });
    setBusy(false);
    if (!res.ok) { const j = await res.json(); toast.error(j.error ?? "Approve failed"); return; }
    const j = await res.json();
    setResult({ admissionNumber: j.admissionNumber, parentEmail: j.parentEmail, tempPassword: j.tempPassword });
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {result ? (
          <>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Admitted!</DialogTitle></DialogHeader>
            <div className="space-y-2 text-sm">
              <p>Admission number: <strong>{result.admissionNumber}</strong></p>
              <div className="rounded-md border bg-muted/40 p-3">
                <p className="font-medium">Parent login</p>
                <p>Email: {result.parentEmail}</p>
                {result.tempPassword ? (
                  <p className="flex items-center gap-2">Password: <code className="rounded bg-background px-2 py-0.5 font-mono">{result.tempPassword}</code><Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(result.tempPassword!); toast.success("Copied"); }}><Copy className="h-3 w-3" /></Button></p>
                ) : <p className="text-muted-foreground">Existing parent account — linked to this child.</p>}
              </div>
            </div>
            <DialogFooter><Button onClick={() => onOpenChange(false)}>Done</Button></DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader><DialogTitle>Approve application</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Admission number will be <strong className="text-foreground">{nextNumber || "…"}</strong></p>
              <div className="space-y-1"><Label className="text-xs">Assign class</Label>
                <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); }}><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
              </div>
              <div className="space-y-1"><Label className="text-xs">Assign section</Label>
                <Select value={sectionId || "_"} onValueChange={(v) => setSectionId(v === "_" ? "" : v)} disabled={!classId}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="_">—</SelectItem>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={approve} disabled={busy}>{busy ? "Approving…" : "Approve & enrol"}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ admissionId, open, onOpenChange, onDone }: { admissionId: string; open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  async function reject() {
    if (!reason.trim()) { toast.error("Reason required"); return; }
    const res = await fetch(`/api/admissions/${admissionId}/reject`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }) });
    if (!res.ok) { toast.error("Reject failed"); return; }
    toast.success("Application rejected"); onOpenChange(false); onDone();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Reject application</DialogTitle></DialogHeader>
        <div className="space-y-1"><Label className="text-xs">Reason</Label><Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} /></div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button variant="destructive" onClick={reject}>Reject</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoDialog({ admissionId, open, onOpenChange, onDone }: { admissionId: string; open: boolean; onOpenChange: (v: boolean) => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  async function save() {
    if (!note.trim()) { toast.error("Note required"); return; }
    const res = await fetch(`/api/admissions/${admissionId}/activity`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
    if (!res.ok) { toast.error("Failed"); return; }
    toast.success("Note added — status stays pending"); onOpenChange(false); onDone();
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Request more info</DialogTitle></DialogHeader>
        <div className="space-y-1"><Label className="text-xs">What's needed?</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} /></div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save}>Add note</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
