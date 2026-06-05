// Albums grid (principal + parent). Uses MediaGrid for consistent responsive
// columns + skeletons. Covers are lazy-loaded <img> (native loading="lazy").
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Images } from "lucide-react";
import type { AlbumCard } from "@/lib/gallery";
import { MediaGrid } from "@/components/media-grid";
import { formatDate } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AlbumsGrid({ editable, endpoint, basePath }: { editable: boolean; endpoint: string; basePath: string }) {
  const router = useRouter();
  const [albums, setAlbums] = useState<AlbumCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState("newest");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`${endpoint}?sort=${sort}`).then((r) => r.json()).then((j) => setAlbums(j.data ?? [])).finally(() => setLoading(false));
  }, [endpoint, sort]);

  async function create() {
    if (!title.trim()) return;
    const res = await fetch("/api/gallery", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, description, date }) });
    if (!res.ok) return toast.error("Failed");
    const { id } = await res.json();
    toast.success("Album created");
    setOpen(false);
    router.push(`/principal/gallery/${id}`); // jump straight to add photos
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Gallery</h1>
        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="photos">Most photos</SelectItem>
            </SelectContent>
          </Select>
          {editable && <Button className="gap-1" onClick={() => setOpen(true)}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Create Album</span></Button>}
        </div>
      </div>

      <MediaGrid
        items={albums}
        loading={loading}
        emptyText="No albums yet."
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
        renderCard={(a) => (
          <Card key={a.id} onClick={() => router.push(`${basePath}/${a.id}`)} className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md">
            <div className="relative aspect-square bg-muted">
              {a.cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.cover} alt={a.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center"><Images className="h-8 w-8 text-muted-foreground" /></div>
              )}
              {a.isNew && <Badge className="absolute left-2 top-2 bg-green-500 text-white">New</Badge>}
            </div>
            <CardContent className="p-3">
              <p className="truncate font-medium">{a.title}</p>
              <p className="text-xs text-muted-foreground">{a.photoCount} photo{a.photoCount === 1 ? "" : "s"} · {formatDate(a.date ?? a.createdAt)}</p>
            </CardContent>
          </Card>
        )}
      />

      {editable && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Create Album</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
              <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={create}>Create</Button></div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
