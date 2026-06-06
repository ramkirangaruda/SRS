// Add-staff dialog. Creates a User(TEACHER) + StaffMember together; the server
// returns a one-time temporary password which we surface so the principal can
// pass it to the new staff member (it's never retrievable again).
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, CheckCircle2 } from "lucide-react";
import { DESIGNATIONS } from "@/lib/staff";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function StaffForm({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", designation: "Teacher", department: "", employeeId: "", qualification: "", experience: "", gender: "", joiningDate: "", salary: "", allowances: "" });
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ tempPassword: string; email: string } | null>(null);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    if (!form.name.trim() || !form.email.trim()) return toast.error("Name and email are required");
    setBusy(true);
    const res = await fetch("/api/staff", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, salary: form.salary ? Number(form.salary) : null, allowances: form.allowances ? Number(form.allowances) : null }),
    });
    setBusy(false);
    if (res.status === 409) { const j = await res.json(); return toast.error(j.error ?? "Already exists"); }
    if (!res.ok) return toast.error("Failed to add staff");
    const j = await res.json();
    setCreated({ tempPassword: j.tempPassword, email: form.email });
    onSaved();
  }

  function close() {
    setCreated(null);
    setForm({ name: "", email: "", phone: "", designation: "Teacher", department: "", employeeId: "", qualification: "", experience: "", gender: "", joiningDate: "", salary: "", allowances: "" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        {created ? (
          // Success screen: show the temp password ONCE.
          <>
            <DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Staff added</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Share these login details with the new staff member. The password is shown only once.</p>
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p><span className="text-muted-foreground">Email:</span> {created.email}</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-muted-foreground">Temp password:</span>
                  <code className="rounded bg-background px-2 py-0.5 font-mono">{created.tempPassword}</code>
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(created.tempPassword); toast.success("Copied"); }}><Copy className="h-3 w-3" /></Button>
                </div>
              </div>
            </div>
            <DialogFooter><Button onClick={close}>Done</Button></DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader><DialogTitle>Add staff member</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name *"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
              <Field label="Email *"><Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
              <Field label="Designation">
                <Select value={form.designation} onValueChange={(v) => set("designation", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DESIGNATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
              </Field>
              <Field label="Department"><Input value={form.department} onChange={(e) => set("department", e.target.value)} /></Field>
              <Field label="Employee ID"><Input value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} /></Field>
              <Field label="Qualification"><Input value={form.qualification} onChange={(e) => set("qualification", e.target.value)} /></Field>
              <Field label="Experience"><Input value={form.experience} onChange={(e) => set("experience", e.target.value)} placeholder="e.g. 5 years" /></Field>
              <Field label="Gender">
                <Select value={form.gender || "__none__"} onValueChange={(v) => set("gender", v === "__none__" ? "" : v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="__none__">—</SelectItem><SelectItem value="MALE">Male</SelectItem><SelectItem value="FEMALE">Female</SelectItem><SelectItem value="OTHER">Other</SelectItem></SelectContent></Select>
              </Field>
              <Field label="Joining date"><Input type="date" value={form.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} /></Field>
              <Field label="Salary (₹/mo)"><Input type="number" value={form.salary} onChange={(e) => set("salary", e.target.value)} /></Field>
              <Field label="Allowances (₹/mo)"><Input type="number" value={form.allowances} onChange={(e) => set("allowances", e.target.value)} /></Field>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={close}>Cancel</Button>
              <Button onClick={submit} disabled={busy}>{busy ? "Adding…" : "Add staff"}</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
