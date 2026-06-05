// Album detail. Masonry photo grid (infinite scroll, 20/page), a multi-file
// uploader with PER-FILE progress, the Lightbox, bulk-delete, and set-cover.
//
// PARALLEL UPLOADS: we don't fire all 20 at once — browsers cap concurrent
// connections (~6) and the server has to Sharp-resize each, so 20 at once would
// queue badly and spike memory. Instead we run a POOL of `CONCURRENCY` (4)
// uploads: as each finishes, the next starts. That keeps the pipe full without
// overwhelming either side, and every file shows its own progress bar.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Trash2, Star, Pencil, X, ArrowLeft, Loader2 } from "lucide-react";
import { MediaGrid } from "@/components/media-grid";
import { Lightbox } from "@/components/lightbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

type Photo = { id: string; thumbUrl: string; imageUrl: string; caption: string | null };
type Album = { id: string; title: string; description: string | null; date: string | null; photoCount: number };
type Upload = { key: string; name: string; progress: number; status: "uploading" | "error" };

const CONCURRENCY = 4;
let ctr = 0;

// Upload one file to the album photos endpoint with progress (XHR for progress).
function uploadOne(albumId: string, file: File, onProgress: (p: number) => void): Promise<Photo> {
  return new Promise((resolve, reject) => {
    const fd = new FormData();
    fd.append("files", file);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/gallery/${albumId}/photos`);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      try { const j = JSON.parse(xhr.responseText); xhr.status < 300 ? resolve(j.data[0]) : reject(new Error(j.error)); }
      catch { reject(new Error("Upload failed")); }
    };
    xhr.onerror = () => reject(new Error("Network error"));
    xhr.send(fd);
  });
}

export function AlbumDetailView({ albumId, editable, backPath }: { albumId: string; editable: boolean; backPath: string }) {
  const router = useRouter();
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadPage = useCallback(async (p: number) => {
    setLoading(true);
    const res = await fetch(`/api/gallery/${albumId}?page=${p}`);
    const j = await res.json();
    setAlbum(j.album);
    setPhotos((prev) => (p === 1 ? j.data : [...prev, ...j.data]));
    setHasMore(j.hasMore);
    setLoading(false);
  }, [albumId]);

  useEffect(() => { loadPage(1); }, [loadPage]);

  function loadMore() { const np = page + 1; setPage(np); loadPage(np); }

  // Pooled uploader.
  async function addFiles(files: File[]) {
    const items: Upload[] = files.map((f) => ({ key: `u${ctr++}`, name: f.name, progress: 0, status: "uploading" }));
    setUploads((u) => [...items, ...u]);
    let idx = 0;
    async function worker() {
      while (idx < files.length) {
        const my = idx++;
        const item = items[my];
        try {
          const photo = await uploadOne(albumId, files[my], (p) => setUploads((u) => u.map((x) => (x.key === item.key ? { ...x, progress: p } : x))));
          setPhotos((prev) => [...prev, photo]);
          setUploads((u) => u.filter((x) => x.key !== item.key));
        } catch (e) {
          setUploads((u) => u.map((x) => (x.key === item.key ? { ...x, status: "error" } : x)));
          toast.error(`${item.name}: ${(e as Error).message}`);
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, files.length) }, worker));
    toast.success("Upload complete");
  }

  function toggleSelect(id: string) { setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function bulkDelete() {
    const ids = Array.from(selected);
    const res = await fetch(`/api/gallery/${albumId}/photos`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    if (!res.ok) return toast.error("Delete failed");
    setPhotos((p) => p.filter((x) => !selected.has(x.id)));
    setSelected(new Set());
    toast.success("Deleted");
  }

  async function setCover(photo: Photo) {
    await fetch(`/api/gallery/${albumId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ coverImage: photo.imageUrl }) });
    toast.success("Cover updated");
  }

  async function deleteAlbum() {
    const res = await fetch(`/api/gallery/${albumId}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    toast.success("Album deleted");
    router.push(backPath);
  }

  return (
    <div className="space-y-4">
      <button onClick={() => router.push(backPath)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to gallery</button>

      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{album?.title ?? "…"}</h1>
          {album?.description && <p className="text-sm text-muted-foreground">{album.description}</p>}
          <p className="text-xs text-muted-foreground">{album?.photoCount ?? 0} photos · {formatDate(album?.date ?? null)}</p>
        </div>
        {editable && (
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(Array.from(e.target.files ?? [])); e.target.value = ""; }} />
            <Button className="gap-1" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /> Add Photos</Button>
            <Button variant="outline" className="gap-1 text-destructive" onClick={() => setConfirmDel(true)}><Trash2 className="h-4 w-4" /> Delete album</Button>
          </div>
        )}
      </div>

      {/* In-progress uploads */}
      {uploads.length > 0 && (
        <div className="space-y-1 rounded-md border p-2">
          {uploads.map((u) => (
            <div key={u.key} className="flex items-center gap-2 text-xs">
              <Loader2 className="h-3 w-3 animate-spin" /><span className="flex-1 truncate">{u.name}</span>
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted"><div className={`h-full ${u.status === "error" ? "bg-destructive" : "bg-primary"}`} style={{ width: `${u.progress}%` }} /></div>
            </div>
          ))}
        </div>
      )}

      {/* Bulk delete bar */}
      {editable && selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2 text-sm">
          <span>{selected.size} selected</span>
          <Button size="sm" variant="outline" className="text-destructive" onClick={bulkDelete}>Delete selected</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      {/* Masonry: CSS columns, 2 on mobile, 3/4 larger. */}
      <MediaGrid
        items={photos}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        emptyText="No photos yet."
        className="columns-2 gap-3 md:columns-3 lg:columns-4 [&>*]:mb-3"
        renderCard={(p, i) => (
          <div key={p.id} className="group relative break-inside-avoid overflow-hidden rounded-lg">
            {editable && (
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleSelect(p.id)} onClick={(e) => e.stopPropagation()} className="absolute left-2 top-2 z-10 h-4 w-4" />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumbUrl} alt={p.caption ?? ""} loading="lazy" decoding="async" onClick={() => setLightbox(i)} className="w-full cursor-pointer object-cover" />
            {editable && (
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/60 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button title="Set as cover" onClick={() => setCover(p)} className="rounded p-1 text-white hover:bg-white/20"><Star className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        )}
      />

      {lightbox !== null && (
        <Lightbox
          images={photos.map((p) => ({ url: p.imageUrl, caption: p.caption }))}
          index={lightbox}
          onClose={() => setLightbox(null)}
          onIndexChange={setLightbox}
        />
      )}

      <ConfirmDialog open={confirmDel} onOpenChange={setConfirmDel} title="Delete album?" description="This permanently deletes the album and all its photos from storage." confirmLabel="Delete" destructive onConfirm={deleteAlbum} />
    </div>
  );
}
