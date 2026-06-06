// New application wizard. Four steps (Student → Parent → Documents → Review) so
// it's a series of short screens on mobile instead of one long scroll. Can be
// pre-filled from an enquiry (convertFrom), which also links the records.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { ADMISSION_SOURCES } from "@/lib/admissions";
import { FileUpload } from "@/components/file-upload";
import type { StoredFile } from "@/lib/upload-constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STEPS = ["Student", "Parent", "Documents", "Review"];
const blank = { studentName: "", dateOfBirth: "", gender: "", bloodGroup: "", previousSchool: "", classAppliedFor: "", parentName: "", motherName: "", phone: "", email: "", address: "", occupation: "", source: "DIRECT", enquiryId: "" };

export function AdmissionForm({ open, onOpenChange, convertFromEnquiryId, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; convertFromEnquiryId?: string | null; onSaved: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ ...blank });
  const [docs, setDocs] = useState<StoredFile[]>([]);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Pre-fill from an enquiry when converting.
  useEffect(() => {
    if (!open) return;
    setStep(0); setDocs([]);
    if (convertFromEnquiryId) {
      fetch(`/api/admissions/prefill?enquiryId=${convertFromEnquiryId}`).then((r) => r.json()).then((d) => {
        if (d && !d.error) setForm({ ...blank, studentName: d.studentName, parentName: d.parentName, phone: d.phone, email: d.email, classAppliedFor: d.classAppliedFor, gender: d.gender, previousSchool: d.previousSchool, address: d.address, source: "ENQUIRY", enquiryId: d.enquiryId });
      });
    } else setForm({ ...blank });
  }, [open, convertFromEnquiryId]);

  async function submit() {
    if (!form.studentName.trim() || !form.classAppliedFor.trim() || !form.phone.trim()) { toast.error("Student name, class and phone are required"); return; }
    setBusy(true);
    const payload = { ...form, documents: docs.map((d) => ({ name: d.name, type: d.type, url: d.url })) };
    const res = await fetch("/api/admissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setBusy(false);
    if (!res.ok) { toast.error("Save failed"); return; }
    const j = await res.json();
    toast.success("Application created");
    onOpenChange(false); onSaved();
    router.push(`/principal/admissions/${j.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>New application {convertFromEnquiryId && <span className="text-sm font-normal text-muted-foreground">(from enquiry)</span>}</DialogTitle></DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-1 text-xs">
          {STEPS.map((s, i) => <div key={s} className={`flex-1 rounded px-2 py-1 text-center ${i === step ? "bg-primary text-primary-foreground" : i < step ? "bg-primary/20" : "bg-muted"}`}>{s}</div>)}
        </div>

        <div className="min-h-[260px] space-y-3 py-2">
          {step === 0 && <>
            <Field label="Student name *"><Input value={form.studentName} onChange={(e) => set("studentName", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date of birth"><Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} /></Field>
              <Field label="Gender"><Select value={form.gender || "_"} onValueChange={(v) => set("gender", v === "_" ? "" : v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="_">—</SelectItem><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent></Select></Field>
              <Field label="Blood group"><Input value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} /></Field>
              <Field label="Class applying for *"><Input value={form.classAppliedFor} onChange={(e) => set("classAppliedFor", e.target.value)} /></Field>
            </div>
            <Field label="Previous school"><Input value={form.previousSchool} onChange={(e) => set("previousSchool", e.target.value)} /></Field>
          </>}
          {step === 1 && <>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Father name"><Input value={form.parentName} onChange={(e) => set("parentName", e.target.value)} /></Field>
              <Field label="Mother name"><Input value={form.motherName} onChange={(e) => set("motherName", e.target.value)} /></Field>
              <Field label="Phone *"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Email"><Input value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Occupation"><Input value={form.occupation} onChange={(e) => set("occupation", e.target.value)} /></Field>
              <Field label="How did you hear?"><Select value={form.source} onValueChange={(v) => set("source", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ADMISSION_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></Field>
            </div>
            <Field label="Address"><Textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={2} /></Field>
          </>}
          {step === 2 && <>
            <p className="text-sm text-muted-foreground">Upload birth certificate, report card, photo, ID proof (any combination).</p>
            <FileUpload value={docs} onChange={setDocs} folder="uploads" maxFiles={8} />
          </>}
          {step === 3 && <div className="space-y-1 text-sm">
            <Review label="Student" value={`${form.studentName} · ${form.classAppliedFor}`} />
            <Review label="DOB / Gender" value={`${form.dateOfBirth || "—"} · ${form.gender || "—"}`} />
            <Review label="Parent" value={`${form.parentName || "—"} · ${form.phone}`} />
            <Review label="Email" value={form.email || "—"} />
            <Review label="Source" value={form.source} />
            <Review label="Documents" value={`${docs.length} file(s)`} />
          </div>}
        </div>

        <div className="flex items-center justify-between border-t pt-3">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
          {step < STEPS.length - 1
            ? <Button onClick={() => setStep((s) => s + 1)}>Next <ChevronRight className="ml-1 h-4 w-4" /></Button>
            : <Button onClick={submit} disabled={busy}><Check className="mr-1 h-4 w-4" /> {busy ? "Submitting…" : "Submit"}</Button>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
function Review({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4 border-b py-1 last:border-0"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}
