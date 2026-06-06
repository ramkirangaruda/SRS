// Create/edit a planner. Plan content can be written INLINE (description) and/or
// have a file attached. Inline is preferred for plans teachers revise often —
// editing a textarea beats re-uploading a document every time.
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ClassWithSections } from "@/lib/students";
import { PLANNER_TYPES } from "@/lib/planners";
import { FileUpload } from "@/components/file-upload";
import type { StoredFile } from "@/lib/upload-constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Opt = { id: string; name: string };
type Planner = { id: string; title: string; description: string | null; type: string; classId: string | null; subjectId: string | null; fileUrl: string | null; fileName: string | null };

export function PlannerForm({ open, onOpenChange, classes, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; classes: ClassWithSections[]; editing: Planner | null; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<string>("LESSON_PLAN");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [subjects, setSubjects] = useState<Opt[]>([]);
  const [file, setFile] = useState<StoredFile[]>([]);
  const [busy, setBusy] = useState(false);
  const NONE = "__none__";

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? ""); setDescription(editing?.description ?? ""); setType(editing?.type ?? "LESSON_PLAN");
    setClassId(editing?.classId ?? ""); setSubjectId(editing?.subjectId ?? "");
    setFile(editing?.fileUrl ? [{ url: editing.fileUrl, name: editing.fileName ?? "file", size: 0, type: "" }] : []);
  }, [open, editing]);

  useEffect(() => {
    if (!classId) { setSubjects([]); return; }
    fetch(`/api/subjects?classId=${classId}`).then((r) => r.json()).then((j) => setSubjects(j.subjects ?? [])).catch(() => setSubjects([]));
  }, [classId]);

  const sections = classes; // class list

  async function save() {
    if (!title.trim()) return toast.error("Title is required");
    setBusy(true);
    const payload = { title, description, type, classId: classId || "", subjectId: subjectId || "", fileUrl: file[0]?.url ?? "", fileName: file[0]?.name ?? "" };
    const res = await fetch(editing ? `/api/planners/${editing.id}` : "/api/planners", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setBusy(false);
    if (!res.ok) return toast.error("Save failed");
    toast.success(editing ? "Planner updated" : "Planner created");
    onOpenChange(false); onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit planner" : "Create planner"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{PLANNER_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Class</Label>
              <Select value={classId || NONE} onValueChange={(v) => { setClassId(v === NONE ? "" : v); setSubjectId(""); }}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value={NONE}>—</SelectItem>{sections.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Subject</Label>
              <Select value={subjectId || NONE} onValueChange={(v) => setSubjectId(v === NONE ? "" : v)} disabled={!classId}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value={NONE}>—</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1"><Label className="text-xs">Plan content (write inline)</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Write the lesson/activity plan here…" /></div>
          <div className="space-y-1"><Label className="text-xs">Or attach a file (optional)</Label><FileUpload value={file} onChange={setFile} folder="planners" maxFiles={1} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
