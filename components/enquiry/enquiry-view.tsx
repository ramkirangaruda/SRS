// Enquiry hub: Board (Kanban) / List / Stats. The Board↔List preference is
// persisted in localStorage (a per-device UI choice, not shared data — so
// localStorage is the right home, vs a DB setting which we'd use if it had to
// follow the user across devices).
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, LayoutGrid, List as ListIcon, Tag, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, LineChart, Line, XAxis, YAxis } from "recharts";
import type { EnquiryCard } from "@/lib/enquiry";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EnquiryBoard } from "@/components/enquiry/enquiry-board";
import { EnquiryForm } from "@/components/enquiry/enquiry-form";
import { CategoriesDialog } from "@/components/enquiry/categories-dialog";
import { FunnelChart } from "@/components/enquiry/funnel-chart";

type Opt = { id: string; name: string };
type View = "board" | "list" | "stats";
const PIE_COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#10b981", "#f59e0b"];
const statusVariant = (s: string) => (s === "CONVERTED" ? "success" : s === "CLOSED" ? "destructive" : "secondary");

export function EnquiryView({ categories: initialCategories }: { categories: Opt[] }) {
  const router = useRouter();
  const [view, setView] = useState<View>("board");
  const [grouped, setGrouped] = useState<Record<string, EnquiryCard[]>>({});
  const [list, setList] = useState<EnquiryCard[]>([]);
  const [categories, setCategories] = useState(initialCategories);
  const [formOpen, setFormOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  // Restore the saved Board/List preference on mount.
  useEffect(() => {
    const saved = localStorage.getItem("enquiryView");
    if (saved === "board" || saved === "list") setView(saved);
  }, []);
  function pickView(v: View) { setView(v); if (v === "board" || v === "list") localStorage.setItem("enquiryView", v); }

  const loadBoard = useCallback(async () => {
    const res = await fetch("/api/enquiry?groupBy=status");
    if (res.ok) setGrouped((await res.json()).grouped);
  }, []);
  const loadList = useCallback(async () => {
    const res = await fetch("/api/enquiry");
    if (res.ok) setList((await res.json()).data);
  }, []);
  useEffect(() => { if (view === "board") loadBoard(); if (view === "list") loadList(); }, [view, loadBoard, loadList]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-md border">
          <button onClick={() => pickView("board")} className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === "board" ? "bg-muted" : ""}`}><LayoutGrid className="h-4 w-4" /> Board</button>
          <button onClick={() => pickView("list")} className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === "list" ? "bg-muted" : ""}`}><ListIcon className="h-4 w-4" /> List</button>
          <button onClick={() => setView("stats")} className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === "stats" ? "bg-muted" : ""}`}><BarChart3 className="h-4 w-4" /> Stats</button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatOpen(true)}><Tag className="mr-1 h-4 w-4" /> Categories</Button>
          <Button onClick={() => setFormOpen(true)}><Plus className="mr-1 h-4 w-4" /> New Enquiry</Button>
        </div>
      </div>

      {view === "board" && <EnquiryBoard grouped={grouped} onChanged={loadBoard} onOpenCard={(id) => router.push(`/principal/enquiry/${id}`)} />}
      {view === "list" && <EnquiryList list={list} onOpen={(id) => router.push(`/principal/enquiry/${id}`)} />}
      {view === "stats" && <EnquiryStats />}

      <EnquiryForm open={formOpen} onOpenChange={setFormOpen} categories={categories} editing={null} onSaved={() => { loadBoard(); loadList(); }} />
      <CategoriesDialog open={catOpen} onOpenChange={setCatOpen} initial={categories} onChanged={(c) => setCategories(c)} />
    </div>
  );
}

function EnquiryList({ list, onOpen }: { list: EnquiryCard[]; onOpen: (id: string) => void }) {
  if (list.length === 0) return <p className="text-sm text-muted-foreground">No enquiries yet.</p>;
  return (
    <div className="space-y-2">
      {list.map((e) => (
        <Card key={e.id} className="cursor-pointer hover:border-primary/50" onClick={() => onOpen(e.id)}>
          <CardContent className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-tight">{e.parentName} {e.childName && <span className="text-xs text-muted-foreground">· {e.childName}</span>}</p>
              <p className="text-xs text-muted-foreground">{e.phone}{e.classInterestedIn ? ` · ${e.classInterestedIn}` : ""} · {e.source}</p>
            </div>
            <span className="text-xs text-muted-foreground">{formatDate(e.createdAt)}</span>
            <Badge variant={statusVariant(e.status)}>{e.status.replace(/_/g, " ")}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EnquiryStats() {
  const [stats, setStats] = useState<{ funnel: Record<string, number>; sources: { source: string; count: number }[]; trend: { month: string; count: number }[] } | null>(null);
  useEffect(() => { fetch("/api/enquiry/stats").then((r) => r.json()).then(setStats); }, []);
  if (!stats) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardContent className="p-4"><p className="mb-3 text-sm font-medium">Conversion funnel</p><FunnelChart funnel={stats.funnel} /></CardContent></Card>
      <Card><CardContent className="p-4">
        <p className="mb-2 text-sm font-medium">Source breakdown</p>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={stats.sources} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={80} label={(p) => (p as { name?: string }).name ?? ""}>
              {stats.sources.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </CardContent></Card>
      <Card className="lg:col-span-2"><CardContent className="p-4">
        <p className="mb-2 text-sm font-medium">Monthly trend</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={stats.trend}><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart>
        </ResponsiveContainer>
      </CardContent></Card>
    </div>
  );
}
