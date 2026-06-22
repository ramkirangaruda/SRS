// Add / edit a toddler. Only the name is required; the rest of the profile
// (DOB, guardian, allergies, medical notes, photo, linked parent account) is
// optional. Photo uses the shared FileUpload (single image).
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { StoredFile } from "@/lib/upload-constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUpload } from "@/components/file-upload";

type Opt = { id: string; name: string };
export type Toddler = {
  id: string; name: string; dateOfBirth: string | null; gender: string | null; photo: string | null;
  guardianName: string | null; guardianPhone: string | null; allergies: string | null;
  medicalNotes: string | null; notes: string | null; parentId: string | null;
};

const NONE = "__none__";
// ISO → "YYYY-MM-DD" for the date input.
const toDateInput = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

const empty = {
  name: "", dateOfBirth: "", gender: "", guardianName: "", guardianPhone: "",
  allergies: "", medicalNotes: "", notes: "", parentId: "",
};

export function ToddlerForm({
  open,
  onOpenChange,
  parents,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  parents: Opt[];
  editing: Toddler | null;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState<StoredFile[]>([]);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setForm({
        name: editing.name,
        dateOfBirth: toDateInput(editing.dateOfBirth),
        gender: editing.gender ?? "",
        guardianName: editing.guardianName ?? "",
        guardianPhone: editing.guardianPhone ?? "",
        allergies: editing.allergies ?? "",
        medicalNotes: editing.medicalNotes ?? "",
        notes: editing.notes ?? "",
        parentId: editing.parentId ?? "",
      });
      setPhoto(editing.photo ? [{ url: editing.photo, name: "photo", size: 0, type: "image" }] : []);
    } else {
      setForm(empty);
      setPhoto([]);
    }
  }, [open, editing]);

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (form.guardianPhone && !/^\d{10}$/.test(form.guardianPhone)) {
      return toast.error("Guardian phone must be 10 digits");
    }
    setBusy(true);
    const payload = { ...form, photo: photo[0]?.url ?? "" };
    const res = await fetch(editing ? `/api/toddlers/${editing.id}` : "/api/toddlers", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Save failed");
    toast.success(editing ? "Toddler updated" : "Toddler added");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit toddler" : "Add toddler"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={100} autoFocus />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date of birth</Label>
              <Input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Gender</Label>
              <Select value={form.gender || NONE} onValueChange={(v) => set("gender", v === NONE ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Linked parent account</Label>
              <Select value={form.parentId || NONE} onValueChange={(v) => set("parentId", v === NONE ? "" : v)}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>— (none)</SelectItem>
                  {parents.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Guardian name</Label>
              <Input value={form.guardianName} onChange={(e) => set("guardianName", e.target.value)} maxLength={100} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Guardian phone (10 digits)</Label>
              <Input value={form.guardianPhone} onChange={(e) => set("guardianPhone", e.target.value)} inputMode="numeric" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Allergies</Label>
            <Input value={form.allergies} onChange={(e) => set("allergies", e.target.value)} placeholder="e.g. Peanuts, dairy" maxLength={500} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Medical notes</Label>
            <Textarea value={form.medicalNotes} onChange={(e) => set("medicalNotes", e.target.value)} rows={2} maxLength={1000} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={2} maxLength={1000} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Photo</Label>
            <FileUpload value={photo} onChange={setPhoto} folder="uploads" maxFiles={1} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : editing ? "Save" : "Add"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
