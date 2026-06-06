// Visitors register: Today / History / Analytics tabs. Today shows a live list
// with status dots + check-out; History adds date range + search + CSV; Analytics
// shows stat cards + a per-day bar chart.
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Download, Pencil, Trash2, LogOut } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { VisitorForm } from "@/components/visitors/visitor-form";
import { PURPOSES } from "@/lib/visitors";

type Opt = { id: string; name: string };
type Visitor = { id: string; name: string; phone: string; purpose: string; purposeOther: string | null; visitingWhomId: string | null; visitingWhomName: string | null; checkInTime: string; checkOutTime: string | null; idProofType: string | null; idNumber: string | null; notes: string | null; onPremises: boolean; isRepeat: boolean };

const fmtTime = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null);
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString();

export function VisitorsView({ hosts }: { hosts: Opt[] }) {
  return (
    <Tabs defaultValue="today" className="space-y-4">
      <TabsList>
        <TabsTrigger value="today">Today</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
        <TabsTrigger value="analytics">Analytics</TabsTrigger>
      </TabsList>
      <TabsContent value="today"><TodayTab hosts={hosts} /></TabsContent>
      <TabsContent value="history"><HistoryTab hosts={hosts} /></TabsContent>
      <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
    </Tabs>
  );
}

function StatusDot({ on }: { on: boolean }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${on ? "bg-orange-500" : "bg-emerald-500"}`} title={on ? "On premises" : "Checked out"} />;
}

function VisitorRowCard({ v, onCheckout, onEdit, onDelete }: { v: Visitor; onCheckout?: (v: Visitor) => void; onEdit: (v: Visitor) => void; onDelete: (v: Visitor) => void }) {
  return (
    <Card>
      <CardContent className="flex flex-wrap items-center gap-3 p-3">
        <StatusDot on={v.onPremises} />
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-medium leading-tight">{v.name} {v.isRepeat && <Badge variant="secondary">Repeat</Badge>}</p>
          <p className="text-xs text-muted-foreground">{v.phone} · {v.purpose === "OTHER" && v.purposeOther ? v.purposeOther : v.purpose.replace(/_/g, " ")}{v.visitingWhomName ? ` · → ${v.visitingWhomName}` : ""}</p>
        </div>
        <div className="text-right text-xs">
          <p>In {fmtTime(v.checkInTime)}</p>
          <p className={v.onPremises ? "font-medium text-orange-600" : "text-muted-foreground"}>{v.onPremises ? "Still here" : `Out ${fmtTime(v.checkOutTime)}`}</p>
        </div>
        <div className="flex gap-1">
          {v.onPremises && onCheckout && <Button size="sm" variant="outline" onClick={() => onCheckout(v)}><LogOut className="mr-1 h-3 w-3" /> Out</Button>}
          <Button size="sm" variant="ghost" onClick={() => onEdit(v)}><Pencil className="h-4 w-4" /></Button>
          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => onDelete(v)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TodayTab({ hosts }: { hosts: Opt[] }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [counts, setCounts] = useState({ total: 0, onPremises: 0 });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Visitor | null>(null);
  const [del, setDel] = useState<Visitor | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/visitors?date=today");
    if (res.ok) { const j = await res.json(); setVisitors(j.data); setCounts(j.counts); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function checkout(v: Visitor) {
    const res = await fetch(`/api/visitors/${v.id}/checkout`, { method: "PATCH" });
    if (!res.ok) { toast.error("Checkout failed"); return; }
    toast.success("Checked out"); load();
  }
  async function remove(v: Visitor) {
    const res = await fetch(`/api/visitors/${v.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    toast.success("Deleted"); setDel(null); load();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">Today: <strong>{counts.total}</strong> visitors · Currently on premises: <strong className="text-orange-600">{counts.onPremises}</strong></p>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="mr-1 h-4 w-4" /> New Visitor</Button>
      </div>
      {visitors.length === 0 ? <p className="text-sm text-muted-foreground">No visitors today yet.</p> : (
        <div className="space-y-2">{visitors.map((v) => <VisitorRowCard key={v.id} v={v} onCheckout={checkout} onEdit={(x) => { setEditing(x); setFormOpen(true); }} onDelete={setDel} />)}</div>
      )}
      <VisitorForm open={formOpen} onOpenChange={setFormOpen} hosts={hosts} editing={editing} onSaved={load} />
      <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} title="Delete this visitor record?" description="This cannot be undone." confirmLabel="Delete" onConfirm={() => { if (del) remove(del); }} />
    </div>
  );
}

function HistoryTab({ hosts }: { hosts: Opt[] }) {
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");
  const [purpose, setPurpose] = useState("ALL");
  const [editing, setEditing] = useState<Visitor | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [del, setDel] = useState<Visitor | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (from) qs.set("from", from);
    if (to) qs.set("to", to);
    if (search) qs.set("search", search);
    if (purpose !== "ALL") qs.set("purpose", purpose);
    const res = await fetch(`/api/visitors?${qs}`);
    if (res.ok) { const j = await res.json(); setVisitors(j.data); }
  }, [from, to, search, purpose]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function remove(v: Visitor) {
    const res = await fetch(`/api/visitors/${v.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    toast.success("Deleted"); setDel(null); load();
  }

  const exportUrl = `/api/visitors/export?${new URLSearchParams({ ...(from ? { from } : {}), ...(to ? { to } : {}) })}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        <span className="text-muted-foreground">→</span>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        <div className="relative flex-1 min-w-40"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={purpose} onValueChange={setPurpose}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All purposes</SelectItem>{PURPOSES.map((p) => <SelectItem key={p} value={p}>{p.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" asChild><a href={exportUrl}><Download className="mr-1 h-4 w-4" /> CSV</a></Button>
      </div>
      {visitors.length === 0 ? <p className="text-sm text-muted-foreground">No visitors match.</p> : (
        <div className="space-y-2">
          {visitors.map((v) => (
            <Card key={v.id}><CardContent className="flex flex-wrap items-center gap-3 p-3">
              <StatusDot on={v.onPremises} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 font-medium leading-tight">{v.name} {v.isRepeat && <Badge variant="secondary">Repeat</Badge>}</p>
                <p className="text-xs text-muted-foreground">{v.phone} · {v.purpose.replace(/_/g, " ")}{v.visitingWhomName ? ` · → ${v.visitingWhomName}` : ""}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground"><p>{fmtDate(v.checkInTime)}</p><p>{fmtTime(v.checkInTime)} – {fmtTime(v.checkOutTime) ?? "—"}</p></div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEditing(v); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDel(v)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
      <VisitorForm open={formOpen} onOpenChange={setFormOpen} hosts={hosts} editing={editing} onSaved={load} />
      <ConfirmDialog open={!!del} onOpenChange={(v) => !v && setDel(null)} title="Delete this visitor record?" description="This cannot be undone." confirmLabel="Delete" onConfirm={() => { if (del) remove(del); }} />
    </div>
  );
}

function AnalyticsTab() {
  const [stats, setStats] = useState<{ total: number; dailyAverage: number; mostCommonPurpose: string | null; peakHour: number | null; perDay: { day: number; count: number }[] } | null>(null);
  useEffect(() => { fetch("/api/visitors/stats").then((r) => r.json()).then(setStats); }, []);
  if (!stats) return <p className="text-sm text-muted-foreground">Loading…</p>;
  const peak = stats.peakHour != null ? `${String(stats.peakHour).padStart(2, "0")}:00` : "—";
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="This month" value={String(stats.total)} />
        <StatCard label="Avg / day" value={String(stats.dailyAverage)} />
        <StatCard label="Top purpose" value={stats.mostCommonPurpose?.replace(/_/g, " ") ?? "—"} />
        <StatCard label="Peak hour" value={peak} />
      </div>
      <Card><CardContent className="p-4">
        <p className="mb-2 text-sm font-medium">Visitors per day (this month)</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={stats.perDay}><XAxis dataKey="day" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </CardContent></Card>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></CardContent></Card>;
}
