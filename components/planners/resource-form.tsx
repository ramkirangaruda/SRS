// Create/edit a single resource: a file upload OR an external link, plus subject
// + type + "share with parents". (Batch upload is a separate flow in the view.)
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { RESOURCE_TYPES } from "@/lib/planners";
import { FileUpload } from "@/components/file-upload";
import type { StoredFile } from "@/lib/upload-constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Opt = { id: string; name: string };
type Resource = { id: string; title: string; description: string | null; type: string; subjectId: string | null; isPublic: boolean };

export function ResourceForm({ open, onOpenChange, subjects, editing, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; subjects: Opt[]; editing: Resource | null; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("DOCUMENT");
  const [subjectId, setSubjectId] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");
  const [file, setFile] = useState<StoredFile[]>([]);
  const [busy, setBusy] = useState(false);
  const NONE = "__none__";

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? ""); setDescription(editing?.description ?? ""); setType(editing?.type ?? "DOCUMENT");
    setSubjectId(editing?.subjectId ?? ""); setIsPublic(editing?.isPublic ?? false); setExternalUrl(""); setFile([]);
  }, [open, editing]);

  async function save() {
    if (!title.trim()) return toast.error("Title is required");
    setBusy(true);
    if (editing) {
      const res = await fetch(`/api/resources/${editing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, type, subjectId: subjectId || "", isPublic }) });
      setBusy(false);
      if (!res.ok) return toast.error("Save failed");
      toast.success("Resource updated"); onOpenChange(false); onSaved(); return;
    }
    const f = file[0];
    const payload = { title, description, type, subjectId: subjectId || "", isPublic, externalUrl: externalUrl || "", fileUrl: f?.url ?? "", fileName: f?.name ?? "", fileSize: f?.size ?? null, fileType: f?.type ?? "" };
    if (!payload.fileUrl && !payload.externalUrl) { setBusy(false); return toast.error("Add a file or an external link"); }
    const res = await fetch("/api/resources", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setBusy(false);
    if (!res.ok) return toast.error("Save failed");
    toast.success("Resource added"); onOpenChange(false); onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editing ? "Edit resource" : "Upload resource"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1"><Label className="text-xs">Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-xs">Type</Label>
              <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{RESOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1"><Label className="text-xs">Subject</Label>
              <Select value={subjectId || NONE} onValueChange={(v) => setSubjectId(v === NONE ? "" : v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value={NONE}>Unfiled</SelectItem>{subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          {!editing && (
            <>
              <div className="space-y-1"><Label className="text-xs">File</Label><FileUpload value={file} onChange={setFile} folder="resources" maxFiles={1} /></div>
              <div className="space-y-1"><Label className="text-xs">…or external link</Label><Input value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" /></div>
            </>
          )}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="h-4 w-4" /> Share with parents</label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
