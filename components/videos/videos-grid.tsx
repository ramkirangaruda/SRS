// Video grid (principal + parent). Cards show a lazy thumbnail, title, duration,
// views, date. Infinite scroll via MediaGrid. Add Video dialog for editors.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Play, Search, Eye } from "lucide-react";
import { MediaGrid } from "@/components/media-grid";
import { VideoForm } from "@/components/videos/video-form";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Vid = { id: string; title: string; thumbnailUrl: string | null; duration: string | null; viewCount: number; source: string; category: string | null; createdAt: string };

export function VideosGrid({ editable, endpoint, basePath }: { editable: boolean; endpoint: string; basePath: string }) {
  const router = useRouter();
  const [items, setItems] = useState<Vid[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [formOpen, setFormOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  const load = useCallback(async (p: number, reset: boolean) => {
    setLoading(true);
    const qs = new URLSearchParams({ page: String(p), sort }); if (search) qs.set("search", search);
    const res = await fetch(`${endpoint}?${qs}`); const j = await res.json();
    setItems((prev) => (reset ? j.data : [...prev, ...j.data]));
    setHasMore(j.hasMore); setLoading(false);
  }, [endpoint, sort, search]);

  useEffect(() => { setPage(1); load(1, true); }, [load]);
  useEffect(() => { const t = setTimeout(() => setSearch(searchInput.trim()), 400); return () => clearTimeout(t); }, [searchInput]);

  function loadMore() { const np = page + 1; setPage(np); load(np, false); }
  const onSaved = useMemo(() => () => { setPage(1); load(1, true); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Videos</h1>
        {editable && <Button className="gap-1" onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Video</span></Button>}
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search videos…" className="pl-9" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} /></div>
        <Select value={sort} onValueChange={setSort}><SelectTrigger className="sm:w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="newest">Newest</SelectItem><SelectItem value="views">Most viewed</SelectItem><SelectItem value="title">Title</SelectItem></SelectContent></Select>
      </div>

      <MediaGrid
        items={items}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        emptyText="No videos yet."
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
        renderCard={(v) => (
          <Card key={v.id} onClick={() => router.push(`${basePath}/${v.id}`)} className="cursor-pointer overflow-hidden transition-shadow hover:shadow-md">
            <div className="relative aspect-video bg-muted">
              {v.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={v.thumbnailUrl} alt={v.title} loading="lazy" decoding="async" className="h-full w-full object-cover" />
              ) : <div className="flex h-full items-center justify-center"><Play className="h-8 w-8 text-muted-foreground" /></div>}
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors hover:bg-black/20"><Play className="h-10 w-10 text-white opacity-0 transition-opacity hover:opacity-100" /></div>
              {v.duration && <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 text-xs text-white">{v.duration}</span>}
            </div>
            <div className="p-3">
              <p className="truncate font-medium">{v.title}</p>
              <p className="flex items-center gap-2 text-xs text-muted-foreground"><Eye className="h-3 w-3" /> {v.viewCount} · {formatDate(v.createdAt)}</p>
            </div>
          </Card>
        )}
      />

      {editable && <VideoForm open={formOpen} onOpenChange={setFormOpen} onSaved={onSaved} />}
    </div>
  );
}
