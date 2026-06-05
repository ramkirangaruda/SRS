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

export function TutorialForm({ open, onOpenChange, classes, categories, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; classes: ClassWithSections[]; categories: Cat[]; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [classId, setClassId] = useState("");
  const [type, setType] = useState<"VIDEO" | "DOCUMENT" | "LINK">("LINK");
  const [linkUrl, setLinkUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<StoredFile[]>([]);

  async function fetchVideo() {
    if (!videoUrl) return;
    const res = await fetch("/api/videos/oembed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: videoUrl }) });
    if (!res.ok) return toast.error("Bad video link");
    const j = await res.json(); setEmbedUrl(j.embedUrl); if (!title) setTitle(j.title); toast.success("Video linked");
  }

  async function save() {
    if (!title.trim()) return toast.error("Title required");
    const body: Record<string, unknown> = { title, description, type, categoryId, classId };
    if (type === "VIDEO") { body.videoUrl = videoUrl; body.embedUrl = embedUrl; }
    if (type === "DOCUMENT") body.fileUrl = files[0]?.url ?? "";
    if (type === "LINK") body.linkUrl = linkUrl;
    const res = await fetch("/api/elearning/tutorials", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return toast.error("Failed");
    toast.success("Tutorial added"); onSaved(); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Tutorial</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Category</Label>
              <Select value={categoryId || NONE} onValueChange={(v) => setCategoryId(v === NONE ? "" : v)}><SelectTrigger><SelectValue placeholder="None" /></SelectTrigger><SelectContent><SelectItem value={NONE}>None</SelectItem>{categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            </div>
            <div className="space-y-1.5"><Label>Class</Label>
              <Select value={classId || NONE} onValueChange={(v) => setClassId(v === NONE ? "" : v)}><SelectTrigger><SelectValue placeholder="All" /></SelectTrigger><SelectContent><SelectItem value={NONE}>All classes</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Content type</Label>
            <div className="flex gap-2">
              {(["VIDEO", "DOCUMENT", "LINK"] as const).map((t) => <Button key={t} type="button" size="sm" variant={type === t ? "default" : "outline"} onClick={() => setType(t)}>{t[0] + t.slice(1).toLowerCase()}</Button>)}
            </div>
          </div>
          {type === "VIDEO" && <div className="flex gap-2"><Input placeholder="YouTube URL" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} /><Button type="button" variant="outline" onClick={fetchVideo}>Link</Button></div>}
          {type === "DOCUMENT" && <FileUpload value={files} onChange={setFiles} maxFiles={1} />}
          {type === "LINK" && <Input placeholder="https://…" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} />}
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save}>Add</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
