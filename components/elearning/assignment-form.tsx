"use client";
import { useState } from "react";
import { toast } from "sonner";
import type { ClassWithSections } from "@/lib/students";
import type { StoredFile } from "@/lib/upload-constants";
import { FileUpload } from "@/components/file-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Cat = { id: string; name: string };
const NONE = "__none__";

export function AssignmentForm({ open, onOpenChange, classes, categories, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; classes: ClassWithSections[]; categories: Cat[]; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [totalMarks, setTotalMarks] = useState("");
  const [files, setFiles] = useState<StoredFile[]>([]);
  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  async function save() {
    if (!title.trim() || !dueDate) return toast.error("Title and due date required");
    const res = await fetch("/api/elearning/assignments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, categoryId, classId, sectionId, dueDate, totalMarks: totalMarks ? Number(totalMarks) : undefined, attachments: files }) });
    if (!res.ok) return toast.error("Failed");
    toast.success("Assignment created"); onSaved(); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Create Assignment</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Category</Label><Select value={categoryId || NONE} onValueChange={(v) => setCategoryId(v === NONE ? "" : v)}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value={NONE}>None</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Class</Label><Select value={classId || NONE} onValueChange={(v) => { setClassId(v === NONE ? "" : v); setSectionId(""); }}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value={NONE}>None</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><Label>Section</Label><Select value={sectionId || NONE} onValueChange={(v) => setSectionId(v === NONE ? "" : v)} disabled={!classId}><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value={NONE}>All</SelectItem>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-1.5"><Label>Due date *</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Total marks</Label><Input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} /></div>
          </div>
          <div className="space-y-1.5"><Label>Reference files</Label><FileUpload value={files} onChange={setFiles} maxFiles={3} /></div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save}>Create</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
