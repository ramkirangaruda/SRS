// A teacher's personal timetable + workload stats. Reused by the principal
// (pick any teacher) and by the teacher's own dashboard (their id, locked).
"use client";

import { useEffect, useState } from "react";
import { Printer } from "lucide-react";
import { cellKey, DAY_LABELS, type Day, type Period, type TeacherStats } from "@/lib/timetable";
import { subjectColor } from "@/lib/colors";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimetableGrid } from "@/components/timetable/timetable-grid";

type Cell = { subjectName: string | null; className: string; sectionName: string };
type Opt = { id: string; name: string };

export function TeacherTimetableView({ teachers, academicYearId, fixedTeacherId }: { teachers?: Opt[]; academicYearId: string; fixedTeacherId?: string }) {
  const [teacherId, setTeacherId] = useState(fixedTeacherId ?? teachers?.[0]?.id ?? "");
  const [periods, setPeriods] = useState<Period[]>([]);
  const [byCell, setByCell] = useState<Record<string, Cell>>({});
  const [stats, setStats] = useState<TeacherStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teacherId || !academicYearId) return;
    setLoading(true);
    fetch(`/api/timetable/teacher/${teacherId}?academicYearId=${academicYearId}`)
      .then((r) => r.json())
      .then((j) => { setPeriods(j.periods ?? []); setByCell(j.byCell ?? {}); setStats(j.stats ?? null); })
      .finally(() => setLoading(false));
  }, [teacherId, academicYearId]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {teachers && !fixedTeacherId ? (
          <Select value={teacherId} onValueChange={setTeacherId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Select teacher" /></SelectTrigger>
            <SelectContent>{teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        ) : <div />}
        {teacherId && (
          <Button variant="outline" size="sm" asChild>
            <a href={`/print/timetable?teacherId=${teacherId}&academicYearId=${academicYearId}`} target="_blank"><Printer className="mr-1 h-4 w-4" /> Print</a>
          </Button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Periods / week" value={String(stats.totalPeriods)} />
          <Stat label="Free periods" value={String(stats.freePeriods)} />
          <Stat label="Busiest day" value={stats.busiestDay ? DAY_LABELS[stats.busiestDay as Day] : "—"} />
          <Stat label="Max consecutive" value={String(stats.maxConsecutive)} warn={stats.overloaded} hint={stats.overloaded ? ">3 in a row" : undefined} />
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
            <TimetableGrid
              periods={periods}
              renderCell={(day: Day, period: Period) => {
                const c = byCell[cellKey(day, period.periodNumber)];
                if (!c) return <div className="h-full w-full rounded border border-dashed bg-muted/30" />;
                const color = subjectColor(c.subjectName);
                return (
                  <div className={`flex h-full w-full flex-col rounded border p-1.5 ${color.bg} ${color.text} ${color.border}`}>
                    <span className="text-xs font-semibold leading-tight">{c.subjectName ?? "—"}</span>
                    <span className="mt-0.5 text-[10px] opacity-80">{c.className}-{c.sectionName}</span>
                  </div>
                );
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, warn, hint }: { label: string; value: string; warn?: boolean; hint?: string }) {
  return (
    <Card className={warn ? "border-amber-400" : ""}>
      <CardContent className="p-3">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-xl font-bold ${warn ? "text-amber-600" : ""}`}>{value}</p>
        {hint && <p className="text-[10px] text-amber-600">{hint}</p>}
      </CardContent>
    </Card>
  );
}
