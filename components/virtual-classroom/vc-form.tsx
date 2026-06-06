// Create/edit a virtual class. Validates the meeting link is Zoom/Meet before
// saving (so nobody schedules a class against a broken link).
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { ClassWithSections } from "@/lib/students";
import type { VCItem } from "@/lib/virtual-classroom";
import { isValidMeetingLink } from "@/lib/meeting-links";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Opt = { id: string; name: string };

export function VCForm({ open, onOpenChange, classes, teachers, editing, onSaved }: {
  open: boolean; onOpenChange: (v: boolean) => void; classes: ClassWithSections[]; teachers: Opt[]; editing: VCItem | null; onSaved: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState("45");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [hostId, setHostId] = useState("");
  const [subjects, setSubjects] = useState<Opt[]>([]);
  const [busy, setBusy] = useState(false);
  const NONE = "__none__";

  // Reset/seed the form whenever it opens (new vs edit).
  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setMeetingLink(editing?.meetingLink ?? "");
    // datetime-local wants "YYYY-MM-DDTHH:MM" in local time.
    setScheduledAt(editing ? toLocalInput(editing.scheduledAt) : "");
    setDuration(String(editing?.duration ?? 45));
    setClassId(editing?.classId ?? classes[0]?.id ?? "");
    setSectionId(editing?.sectionId ?? "");
    setSubjectId(editing?.subjectId ?? "");
    setHostId(editing?.hostId ?? "");
  }, [open, editing, classes]);

  useEffect(() => {
    if (!classId) { setSubjects([]); return; }
    fetch(`/api/subjects?classId=${classId}`).then((r) => r.json()).then((j) => setSubjects(j.subjects ?? [])).catch(() => setSubjects([]));
  }, [classId]);

  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  async function save() {
    if (!title.trim()) return toast.error("Title is required");
    if (!isValidMeetingLink(meetingLink)) return toast.error("Enter a valid Zoom or Google Meet link");
    if (!scheduledAt) return toast.error("Pick a date & time");
    setBusy(true);
    const payload = {
      title, description, meetingLink,
      scheduledAt: new Date(scheduledAt).toISOString(), duration: Number(duration),
      classId, sectionId: sectionId || "", subjectId: subjectId || "", hostId: hostId || "",
    };
    const res = await fetch(editing ? `/api/virtual-classroom/${editing.id}` : "/api/virtual-classroom", {
      method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
    setBusy(false);
    if (!res.ok) return toast.error("Save failed");
    toast.success(editing ? "Class updated" : "Class scheduled");
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit class" : "Schedule virtual class"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Maths: Fractions" /></div>
          <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="space-y-1"><Label className="text-xs">Meeting link (Zoom / Google Meet)</Label><Input value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/abc-defg-hij" /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">Date & time</Label><Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Duration (min)</Label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">Class</Label>
              <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); setSubjectId(""); }}><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Section (optional)</Label>
              <Select value={sectionId || NONE} onValueChange={(v) => setSectionId(v === NONE ? "" : v)}><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value={NONE}>All sections</SelectItem>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Subject (optional)</Label>
              <Select value={subjectId || NONE} onValueChange={(v) => setSubjectId(v === NONE ? "" : v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value={NONE}>—</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Host (optional)</Label>
              <Select value={hostId || NONE} onValueChange={(v) => setHostId(v === NONE ? "" : v)}><SelectTrigger><SelectValue placeholder="Me" /></SelectTrigger><SelectContent><SelectItem value={NONE}>Me</SelectItem>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ISO → "YYYY-MM-DDTHH:MM" in the browser's local time (for datetime-local input).
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
