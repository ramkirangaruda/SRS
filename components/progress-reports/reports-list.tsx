// Manage generated reports: filter, bulk-publish, per-row stale warning +
// regenerate, and view/download (print page). DRAFT vs PUBLISHED is shown as a
// badge — DRAFT reports are NOT visible to parents until published.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, RefreshCw, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Row = { id: string; studentName: string; className: string | null; term: string; overallGrade: string | null; rank: number | null; status: string; stale: boolean };

export function ReportsList({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(() => fetch("/api/progress-reports").then((r) => r.json()).then((j) => setRows(j.data ?? [])), []);
  useEffect(() => { load(); }, [load, refreshKey]);

  function toggle(id: string) { setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; }); }

  async function publish() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    const res = await fetch("/api/progress-reports/publish", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids }) });
    if (!res.ok) return toast.error("Publish failed");
    toast.success(`Published ${ids.length}`); setSelected(new Set()); load();
  }
  async function regenerate(id: string) {
    const res = await fetch(`/api/progress-reports/regenerate/${id}`, { method: "POST" });
    if (!res.ok) return toast.error("Regenerate failed");
    toast.success("Regenerated"); load();
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/40 p-2 text-sm">
          <span>{selected.size} selected</span>
          <Button size="sm" onClick={publish}>Publish selected</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}
      {rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No reports generated yet.</CardContent></Card>
      ) : rows.map((r) => (
        <Card key={r.id}><CardContent className="flex flex-wrap items-center gap-3 p-3">
          <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} className="h-4 w-4" />
          <div className="min-w-40 flex-1">
            <p className="font-medium">{r.studentName}</p>
            <p className="text-xs text-muted-foreground">{r.className ?? "—"} · {r.term} · Grade {r.overallGrade ?? "—"} · Rank {r.rank ?? "—"}</p>
            {r.stale && <p className="mt-1 flex items-center gap-1 text-xs text-amber-600"><AlertTriangle className="h-3 w-3" /> Data changed since generated</p>}
          </div>
          <Badge variant={r.status === "PUBLISHED" ? "success" : "secondary"}>{r.status}</Badge>
          <div className="flex gap-1">
            {r.stale && <Button size="sm" variant="ghost" className="gap-1" onClick={() => regenerate(r.id)}><RefreshCw className="h-4 w-4" /> Regenerate</Button>}
            <Button asChild size="sm" variant="ghost"><Link href={`/print/progress-report/${r.id}`} target="_blank"><Eye className="h-4 w-4" /></Link></Button>
            <Button asChild size="sm" variant="ghost"><Link href={`/print/progress-report/${r.id}?print=1`} target="_blank"><Download className="h-4 w-4" /></Link></Button>
          </div>
        </CardContent></Card>
      ))}
    </div>
  );
}
