// Parent timetable view. Shows a child's weekly grid, switchable between
// children, with TODAY's column and the CURRENT period highlighted so a parent
// can see "what is my child doing right now?" at a glance.
"use client";

import { useEffect, useMemo, useState } from "react";
import { cellKey, DAYS, type Day, type Period, type Entry } from "@/lib/timetable";
import { subjectColor } from "@/lib/colors";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimetableGrid } from "@/components/timetable/timetable-grid";

type ChildOpt = { id: string; name: string; className: string | null };
type Timetable = { periods: Period[]; byCell: Record<string, Entry> } | null;
type Selected = { id: string; name: string; className: string | null; sectionName: string | null } | null;

// JS getDay(): 0=Sun..6=Sat. Map to our MON..SAT keys (Sunday → null).
function todayKey(): Day | null {
  const map: Record<number, Day> = { 1: "MON", 2: "TUE", 3: "WED", 4: "THU", 5: "FRI", 6: "SAT" };
  return map[new Date().getDay()] ?? null;
}

// "HH:MM" → minutes since midnight, for comparing against now.
function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function ParentTimetable({ initial }: { initial: { children: ChildOpt[]; selected: Selected; timetable: Timetable } }) {
  const [childId, setChildId] = useState(initial.selected?.id ?? "");
  const [data, setData] = useState(initial);

  // Re-fetch when the parent picks a different child.
  useEffect(() => {
    if (!childId || childId === initial.selected?.id) return;
    fetch(`/api/parent/timetable?studentId=${childId}`).then((r) => r.json()).then(setData);
  }, [childId, initial.selected?.id]);

  // Tick every minute so the "current period" highlight stays accurate.
  const [nowMin, setNowMin] = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); });
  useEffect(() => {
    const id = setInterval(() => { const n = new Date(); setNowMin(n.getHours() * 60 + n.getMinutes()); }, 60_000);
    return () => clearInterval(id);
  }, []);

  const today = todayKey();
  const currentPeriod = useMemo(() => {
    if (!data.timetable) return null;
    const p = data.timetable.periods.find((p) => nowMin >= toMinutes(p.startTime) && nowMin < toMinutes(p.endTime));
    return p?.periodNumber ?? null;
  }, [data.timetable, nowMin]);

  if (data.children.length === 0) return <p className="text-muted-foreground">No children linked to your account.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {data.children.length > 1 ? (
          <Select value={childId} onValueChange={setChildId}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>{data.children.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.className ? ` · ${c.className}` : ""}</SelectItem>)}</SelectContent>
          </Select>
        ) : <div />}
        {data.selected && <p className="text-sm text-muted-foreground">{data.selected.className ?? ""}{data.selected.sectionName ? `-${data.selected.sectionName}` : ""}</p>}
      </div>

      {/* Today strip — the child's classes for today only, easiest to scan. */}
      {data.timetable && today && (
        <Card>
          <CardContent className="p-4">
            <p className="mb-2 text-sm font-medium">Today ({today})</p>
            <div className="flex flex-wrap gap-2">
              {data.timetable.periods.filter((p) => p.type === "CLASS").map((p) => {
                const e = data.timetable!.byCell[cellKey(today, p.periodNumber)];
                const color = subjectColor(e?.subjectName);
                const live = currentPeriod === p.periodNumber;
                return (
                  <div key={p.id} className={`rounded border px-2 py-1 text-xs ${e ? `${color.bg} ${color.text} ${color.border}` : "border-dashed text-muted-foreground"} ${live ? "ring-2 ring-primary" : ""}`}>
                    <span className="font-semibold">{e?.subjectName ?? "Free"}</span>
                    <span className="ml-1 opacity-70">{p.startTime}</span>
                    {live && <span className="ml-1 font-bold text-primary">• now</span>}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-4">
          {data.timetable ? (
            <TimetableGrid
              periods={data.timetable.periods}
              highlightDay={today}
              highlightPeriod={currentPeriod}
              renderCell={(day: Day, period: Period) => {
                const e = data.timetable!.byCell[cellKey(day, period.periodNumber)];
                if (!e) return <div className="h-full w-full rounded border border-dashed bg-muted/20" />;
                const color = subjectColor(e.subjectName);
                return (
                  <div className={`flex h-full w-full flex-col rounded border p-1.5 ${color.bg} ${color.text} ${color.border}`}>
                    <span className="text-xs font-semibold leading-tight">{e.subjectName ?? "—"}</span>
                    {e.teacherName && <span className="mt-0.5 text-[10px] opacity-80">{e.teacherName}</span>}
                  </div>
                );
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No timetable published for this class yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
