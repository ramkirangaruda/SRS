// Admissions hub: Pipeline (3 columns) + Stats. New Application opens the wizard;
// if the URL has ?convertFrom=<enquiryId> we auto-open it pre-filled from that
// enquiry. Status changes happen via Approve/Reject on the detail page (not drag),
// because approval needs class/section assignment.
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, BarChart3, LayoutGrid } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import type { AdmissionCard } from "@/lib/admissions";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdmissionForm } from "@/components/admissions/admission-form";

const COLS: { key: string; label: string }[] = [{ key: "PENDING", label: "Pending" }, { key: "APPROVED", label: "Approved" }, { key: "REJECTED", label: "Rejected" }];
const statusVariant = (s: string) => (s === "APPROVED" ? "success" : s === "REJECTED" ? "destructive" : "secondary");

export function AdmissionsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const convertFrom = searchParams.get("convertFrom");
  const [tab, setTab] = useState<"pipeline" | "stats">("pipeline");
  const [grouped, setGrouped] = useState<Record<string, AdmissionCard[]>>({});
  const [formOpen, setFormOpen] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admissions?groupBy=status");
    if (res.ok) setGrouped((await res.json()).grouped);
  }, []);
  useEffect(() => { load(); }, [load]);
  // Auto-open the wizard when arriving from an enquiry conversion.
  useEffect(() => { if (convertFrom) setFormOpen(true); }, [convertFrom]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex rounded-md border">
          <button onClick={() => setTab("pipeline")} className={`flex items-center gap-1 px-3 py-1.5 text-sm ${tab === "pipeline" ? "bg-muted" : ""}`}><LayoutGrid className="h-4 w-4" /> Pipeline</button>
          <button onClick={() => setTab("stats")} className={`flex items-center gap-1 px-3 py-1.5 text-sm ${tab === "stats" ? "bg-muted" : ""}`}><BarChart3 className="h-4 w-4" /> Stats</button>
        </div>
        <Button onClick={() => setFormOpen(true)}><Plus className="mr-1 h-4 w-4" /> New Application</Button>
      </div>

      {tab === "pipeline" ? (
        <div className="grid gap-3 md:grid-cols-3">
          {COLS.map((col) => (
            <div key={col.key} className="rounded-lg border bg-muted/30 p-2">
              <p className="mb-2 px-1 text-sm font-semibold">{col.label} <span className="text-muted-foreground">({grouped[col.key]?.length ?? 0})</span></p>
              <div className="space-y-2">
                {(grouped[col.key] ?? []).map((a) => (
                  <Card key={a.id} className="cursor-pointer hover:border-primary/50" onClick={() => router.push(`/principal/admissions/${a.id}`)}>
                    <CardContent className="space-y-1 p-2.5">
                      <p className="text-sm font-medium leading-tight">{a.studentName}</p>
                      <p className="text-xs text-muted-foreground">{a.parentName} · Class {a.classAppliedFor}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-muted-foreground">{a.source === "ENQUIRY" ? "From enquiry" : a.source} · {formatDate(a.createdAt)}</span>
                        {a.assignedAdmissionNumber && <Badge variant="success">{a.assignedAdmissionNumber}</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(grouped[col.key] ?? []).length === 0 && <p className="px-1 text-xs text-muted-foreground">None</p>}
              </div>
            </div>
          ))}
        </div>
      ) : <AdmissionStats />}

      <AdmissionForm open={formOpen} onOpenChange={(v) => { setFormOpen(v); if (!v && convertFrom) router.replace("/principal/admissions"); }} convertFromEnquiryId={convertFrom} onSaved={load} />
    </div>
  );
}

function AdmissionStats() {
  const [stats, setStats] = useState<{ counts: Record<string, number>; total: number; approvalRate: number; classBreakdown: { className: string; count: number }[]; trend: { month: string; count: number }[] } | null>(null);
  useEffect(() => { fetch("/api/admissions/stats").then((r) => r.json()).then(setStats); }, []);
  if (!stats) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={String(stats.total)} />
        <StatCard label="Pending" value={String(stats.counts.PENDING)} />
        <StatCard label="Approved" value={String(stats.counts.APPROVED)} />
        <StatCard label="Rejected" value={String(stats.counts.REJECTED)} />
        <StatCard label="Approval rate" value={`${stats.approvalRate}%`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card><CardContent className="p-4">
          <p className="mb-2 text-sm font-medium">Applications by class</p>
          <ResponsiveContainer width="100%" height={220}><BarChart data={stats.classBreakdown}><XAxis dataKey="className" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} /></BarChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="mb-2 text-sm font-medium">Monthly trend</p>
          <ResponsiveContainer width="100%" height={220}><LineChart data={stats.trend}><XAxis dataKey="month" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} /><Tooltip /><Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} /></LineChart></ResponsiveContainer>
        </CardContent></Card>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></CardContent></Card>;
}
