// Parent daycare view. Today tab: live status + today's timeline per child, with
// LIGHTWEIGHT polling (every 30s) that sends the last-updated marker and only
// re-renders if the server says something changed. History tab: mood calendar +
// weekly summary.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getInitials } from "@/lib/format";
import type { FullLog } from "@/lib/daycare";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarView } from "@/components/calendar-view";
import { LogTimeline } from "@/components/daycare/log-timeline";

type Child = { id: string; name: string; photo: string | null; className: string | null; status: string; log: FullLog };
type TodayData = { enrolled: boolean; children: Child[]; lastUpdated: string | null };

const statusLabel = (c: Child) => {
  const t = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");
  if (c.status === "CHECKED_OUT") return `Checked out at ${t(c.log.checkOutTime)}`;
  if (c.status === "CHECKED_IN") return `Checked in at ${t(c.log.checkInTime)}`;
  return "Not yet arrived";
};

export function ParentDaycare({ initial }: { initial: TodayData }) {
  if (!initial.enrolled) {
    return <p className="rounded-md border bg-muted/30 p-6 text-center text-muted-foreground">Daycare tracking is not enabled for your child.</p>;
  }
  return (
    <Tabs defaultValue="today" className="space-y-4">
      <TabsList>
        <TabsTrigger value="today">Today</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="today"><TodayTab initial={initial} /></TabsContent>
      <TabsContent value="history"><HistoryTab children={initial.children.map((c) => ({ id: c.id, name: c.name }))} /></TabsContent>
    </Tabs>
  );
}

function TodayTab({ initial }: { initial: TodayData }) {
  const [data, setData] = useState(initial);
  const [updatedAt, setUpdatedAt] = useState<Date>(new Date());
  const lastUpdated = useRef<string | null>(initial.lastUpdated);

  // Lightweight poll: send our marker; the server returns { changed:false } (tiny)
  // when nothing moved, so we only pay for a full payload when there's news.
  useEffect(() => {
    const id = setInterval(async () => {
      const res = await fetch(`/api/parent/daycare/today?since=${encodeURIComponent(lastUpdated.current ?? "")}`);
      if (!res.ok) return;
      const j = await res.json();
      if (j.changed) { setData(j); lastUpdated.current = j.lastUpdated; setUpdatedAt(new Date()); }
    }, 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Updated {timeAgo(updatedAt)}</p>
      {data.children.map((c) => (
        <Card key={c.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              {c.photo ? <img src={c.photo} alt={c.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{getInitials(c.name)}</div>}
              <div className="flex-1"><p className="font-medium">{c.name}</p><p className="text-xs text-muted-foreground">{c.className ?? ""}</p></div>
              <Badge variant={c.status === "CHECKED_IN" ? "success" : c.status === "CHECKED_OUT" ? "secondary" : "outline"}>{statusLabel(c)}</Badge>
            </div>
            <LogTimeline log={c.log} />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HistoryTab({ children }: { children: { id: string; name: string }[] }) {
  const [studentId, setStudentId] = useState(children[0]?.id ?? "");
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [logs, setLogs] = useState<{ date: string; mood: string | null }[]>([]);
  const [dayLog, setDayLog] = useState<FullLog | null>(null);
  const [summary, setSummary] = useState<{ daysAttended: number; avgCheckIn: string | null; totalHours: number; topActivities: { name: string; count: number }[]; eatingRate: number | null } | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    const from = `${ym.year}-${String(ym.month).padStart(2, "0")}-01`;
    const to = `${ym.year}-${String(ym.month).padStart(2, "0")}-31`;
    const [h, s] = await Promise.all([
      fetch(`/api/parent/daycare/${studentId}/history?from=${from}&to=${to}`).then((r) => r.json()),
      fetch(`/api/parent/daycare/${studentId}/weekly-summary`).then((r) => r.json()),
    ]);
    setLogs(h.logs ?? []); setSummary(s);
  }, [studentId, ym]);
  useEffect(() => { load(); }, [load]);

  async function showDay(dateKey: string) {
    const res = await fetch(`/api/parent/daycare/${studentId}/log?date=${dateKey}`);
    setDayLog(await res.json());
  }
  const moodColor = (mood: string | null) => mood === "HAPPY" ? "bg-emerald-500" : mood === "OKAY" ? "bg-amber-500" : mood === "UPSET" ? "bg-orange-500" : mood === "SICK" ? "bg-red-500" : "bg-muted";

  return (
    <div className="space-y-4">
      {children.length > 1 && <Select value={studentId} onValueChange={setStudentId}><SelectTrigger className="w-56"><SelectValue /></SelectTrigger><SelectContent>{children.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>}

      {summary && (
        <Card><CardContent className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <Stat label="Days this week" value={String(summary.daysAttended)} />
          <Stat label="Avg check-in" value={summary.avgCheckIn ?? "—"} />
          <Stat label="Total hours" value={`${summary.totalHours}h`} />
          <Stat label="Ate offered meals" value={summary.eatingRate != null ? `${summary.eatingRate}%` : "—"} />
          {summary.topActivities.length > 0 && <div className="col-span-2 sm:col-span-4 text-xs text-muted-foreground">Most common: {summary.topActivities.map((a) => `${a.name} (${a.count})`).join(", ")}</div>}
        </CardContent></Card>
      )}

      <CalendarView
        year={ym.year} month={ym.month}
        onMonthChange={(year, month) => setYm({ year, month })}
        items={logs.map((l) => ({ ...l, date: l.date }))}
        renderDay={(_key, items) => items[0] ? <span className={`mx-auto mt-1 block h-2 w-2 rounded-full ${moodColor(items[0].mood)}`} /> : null}
        renderDetails={(key) => (
          <div>
            <button className="mb-2 text-sm text-blue-600 underline" onClick={() => showDay(key)}>Load {key}</button>
            {dayLog && dayLog.date === key && <LogTimeline log={dayLog} />}
          </div>
        )}
      />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-bold">{value}</p></div>;
}

function timeAgo(d: Date) {
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  return `${Math.floor(s / 60)}m ago`;
}
