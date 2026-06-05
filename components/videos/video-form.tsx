// Add Video dialog: paste a YouTube/Vimeo link (auto-fills via oEmbed) OR upload
// an mp4 with a progress bar + ETA.
//
// UPLOAD ETA: in the XHR progress handler we know bytesSent (e.loaded) and
// elapsed time. speed = bytesSent / elapsed; remaining seconds = (total -
// bytesSent) / speed. We smooth it a touch by recomputing each tick.
"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Link2, Upload, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function fmt(sec: number) { if (!isFinite(sec) || sec < 0) return "…"; const m = Math.floor(sec / 60); const s = Math.round(sec % 60); return m > 0 ? `${m}m ${s}s` : `${s}s`; }

export function VideoForm({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [source, setSource] = useState("YOUTUBE");
  const [videoUrl, setVideoUrl] = useState("");
  const [embedUrl, setEmbedUrl] = useState<string | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [fetching, setFetching] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [eta, setEta] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function fetchMeta() {
    if (!linkInput.trim()) return;
    setFetching(true);
    const res = await fetch("/api/videos/oembed", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: linkInput }) });
    setFetching(false);
    if (!res.ok) { toast.error("Could not read that link"); return; }
    const j = await res.json();
    setSource(j.source); setVideoUrl(j.videoUrl); setEmbedUrl(j.embedUrl); setThumbnailUrl(j.thumbnail); if (!title) setTitle(j.title);
    toast.success("Details fetched");
  }

  function uploadFile(file: File) {
    setProgress(0);
    const start = Date.now();
    const fd = new FormData(); fd.append("file", file); fd.append("folder", "videos");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");
    xhr.upload.onprogress = (e) => {
      if (!e.lengthComputable) return;
      const pct = Math.round((e.loaded / e.total) * 100);
      setProgress(pct);
      const elapsed = (Date.now() - start) / 1000;
      const speed = e.loaded / Math.max(elapsed, 0.1); // bytes/sec
      setEta(fmt((e.total - e.loaded) / speed));
    };
    xhr.onload = () => {
      setProgress(null);
      try { const j = JSON.parse(xhr.responseText); if (xhr.status < 300) { setSource("UPLOAD"); setVideoUrl(j.url); setEmbedUrl(null); toast.success("Video uploaded"); } else toast.error(j.error); }
      catch { toast.error("Upload failed"); }
    };
    xhr.onerror = () => { setProgress(null); toast.error("Upload failed"); };
    xhr.send(fd);
  }

  async function save() {
    if (!title.trim() || !videoUrl) { toast.error("Add a video and title first"); return; }
    setBusy(true);
    const res = await fetch("/api/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, category, source, videoUrl, embedUrl, thumbnailUrl }) });
    setBusy(false);
    if (!res.ok) { toast.error("Failed to save"); return; }
    toast.success("Video added"); onSaved(); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Video</DialogTitle></DialogHeader>
        <Tabs defaultValue="link">
          <TabsList><TabsTrigger value="link"><Link2 className="mr-1 h-4 w-4" /> Link</TabsTrigger><TabsTrigger value="upload"><Upload className="mr-1 h-4 w-4" /> Upload</TabsTrigger></TabsList>
          <TabsContent value="link" className="space-y-2 pt-2">
            <Label>YouTube / Vimeo URL</Label>
            <div className="flex gap-2">
              <Input value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
              <Button type="button" variant="outline" onClick={fetchMeta} disabled={fetching}>{fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}</Button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {thumbnailUrl && <img src={thumbnailUrl} alt="" className="mt-2 max-h-32 rounded" />}
          </TabsContent>
          <TabsContent value="upload" className="space-y-2 pt-2">
            <Label>Video file (mp4, max 100 MB)</Label>
            <input ref={fileRef} type="file" accept="video/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); }} className="text-sm" />
            {progress !== null && (
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
                <p className="text-xs text-muted-foreground">{progress}% · {eta} remaining</p>
              </div>
            )}
            {source === "UPLOAD" && videoUrl && <p className="text-xs text-green-700">Uploaded ✓</p>}
          </TabsContent>
        </Tabs>

        <div className="space-y-3 pt-2">
          <div className="space-y-1.5"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Category / tag</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} /></div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button><Button onClick={save} disabled={busy}>Save</Button></div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
