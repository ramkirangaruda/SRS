// Staff detail view: header + Profile / Timetable / Classes tabs, plus edit and
// soft deactivate/reactivate actions. Salary is principal-only (this whole page
// is principal-only) and shown on the Profile tab.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, UserX, UserCheck } from "lucide-react";
import type { StaffDetail } from "@/lib/staff";
import { DESIGNATIONS, STAFF_STATUSES } from "@/lib/staff";
import { formatDate, getInitials } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TeacherTimetableView } from "@/components/timetable/teacher-timetable";

type ClassTaught = { className: string; sectionName: string; subjects: string[] };
const statusVariant = (s: string) => (s === "ACTIVE" ? "success" : s === "ON_LEAVE" ? "secondary" : "destructive");

export function StaffDetailView({ staff, classes, academicYearId }: { staff: StaffDetail; classes: ClassTaught[]; academicYearId: string }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const isActive = staff.status !== "RESIGNED" && staff.isActive;

  async function toggleActive() {
    const res = await fetch(`/api/staff/${staff.id}/deactivate${isActive ? "" : "?reactivate=1"}`, { method: "POST" });
    if (!res.ok) { toast.error("Action failed"); return; }
    toast.success(isActive ? "Staff deactivated" : "Staff reactivated");
    setConfirmDeactivate(false);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          {staff.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={staff.photo} alt={staff.name} className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-xl font-semibold text-primary-foreground">{getInitials(staff.name)}</div>
          )}
          <div>
            <h1 className="text-2xl font-bold">{staff.name}</h1>
            <p className="text-muted-foreground">{staff.designation ?? "Staff"}{staff.department ? ` · ${staff.department}` : ""} <Badge variant={statusVariant(staff.status)}>{staff.status}</Badge></p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="mr-1 h-4 w-4" /> Edit</Button>
          {isActive ? (
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => setConfirmDeactivate(true)}><UserX className="mr-1 h-4 w-4" /> Deactivate</Button>
          ) : (
            <Button variant="outline" size="sm" className="text-emerald-600" onClick={toggleActive}><UserCheck className="mr-1 h-4 w-4" /> Reactivate</Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="timetable">Timetable</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-lg">Contact & Personal</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Email" value={staff.email} />
                <Row label="Phone" value={staff.phone ?? "—"} />
                <Row label="Gender" value={staff.gender ?? "—"} />
                <Row label="Date of birth" value={staff.dateOfBirth ? formatDate(staff.dateOfBirth) : "—"} />
                <Row label="Address" value={staff.address ?? "—"} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-lg">Employment</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <Row label="Employee ID" value={staff.employeeId ?? "—"} />
                <Row label="Qualification" value={staff.qualification ?? "—"} />
                <Row label="Experience" value={staff.experience ?? "—"} />
                <Row label="Joining date" value={staff.joiningDate ? formatDate(staff.joiningDate) : "—"} />
                <Row label="Salary" value={staff.salary != null ? `₹${staff.salary.toLocaleString("en-IN")}/mo` : "—"} />
                <Row label="Allowances" value={staff.allowances != null ? `₹${staff.allowances.toLocaleString("en-IN")}/mo` : "—"} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="timetable">
          {academicYearId ? <TeacherTimetableView fixedTeacherId={staff.userId} academicYearId={academicYearId} /> : <p className="text-sm text-muted-foreground">No active academic year.</p>}
        </TabsContent>

        <TabsContent value="classes">
          <Card>
            <CardHeader><CardTitle className="text-lg">Classes taught</CardTitle></CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <p className="text-sm text-muted-foreground">Not assigned to any class in the timetable.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {classes.map((c, i) => (
                    <li key={i} className="flex items-center justify-between border-b pb-2 last:border-0">
                      <span className="font-medium">{c.className}-{c.sectionName}</span>
                      <span className="text-muted-foreground">{c.subjects.join(", ") || "—"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <StaffEditDialog open={editOpen} onOpenChange={setEditOpen} staff={staff} onSaved={() => router.refresh()} />
      <ConfirmDialog
        open={confirmDeactivate}
        onOpenChange={setConfirmDeactivate}
        title={`Deactivate ${staff.name}?`}
        description="They will be marked RESIGNED and can no longer log in. Their timetable entries, homework and virtual classes are preserved as historical records."
        confirmLabel="Deactivate"
        onConfirm={toggleActive}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

// Edit dialog: updates HR fields (email/login is immutable here).
function StaffEditDialog({ open, onOpenChange, staff, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; staff: StaffDetail; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: staff.name, phone: staff.phone ?? "", designation: staff.designation ?? "Teacher", department: staff.department ?? "",
    employeeId: staff.employeeId ?? "", qualification: staff.qualification ?? "", experience: staff.experience ?? "",
    gender: staff.gender ?? "", joiningDate: staff.joiningDate?.slice(0, 10) ?? "", status: staff.status,
    salary: staff.salary?.toString() ?? "", allowances: staff.allowances?.toString() ?? "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    const res = await fetch(`/api/staff/${staff.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, salary: form.salary ? Number(form.salary) : null, allowances: form.allowances ? Number(form.allowances) : null }),
    });
    setBusy(false);
    if (!res.ok) { toast.error("Update failed"); return; }
    toast.success("Staff updated");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Edit {staff.name}</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <F label="Name"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></F>
          <F label="Phone"><Input value={form.phone} onChange={(e) => set("phone", e.target.value)} /></F>
          <F label="Designation"><Select value={form.designation} onValueChange={(v) => set("designation", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{DESIGNATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></F>
          <F label="Department"><Input value={form.department} onChange={(e) => set("department", e.target.value)} /></F>
          <F label="Employee ID"><Input value={form.employeeId} onChange={(e) => set("employeeId", e.target.value)} /></F>
          <F label="Status"><Select value={form.status} onValueChange={(v) => set("status", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{STAFF_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select></F>
          <F label="Qualification"><Input value={form.qualification} onChange={(e) => set("qualification", e.target.value)} /></F>
          <F label="Experience"><Input value={form.experience} onChange={(e) => set("experience", e.target.value)} /></F>
          <F label="Joining date"><Input type="date" value={form.joiningDate} onChange={(e) => set("joiningDate", e.target.value)} /></F>
          <F label="Salary (₹/mo)"><Input type="number" value={form.salary} onChange={(e) => set("salary", e.target.value)} /></F>
          <F label="Allowances (₹/mo)"><Input type="number" value={form.allowances} onChange={(e) => set("allowances", e.target.value)} /></F>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><Label className="text-xs">{label}</Label>{children}</div>;
}
