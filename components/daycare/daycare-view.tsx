// Principal/Teacher daycare manager. Two tabs:
//   • Today — date picker + a card per daycare student with check-in/out and a
//     button to open their daily log form.
//   • History — pick a student → calendar with mood-colored dots → click a day
//     to see the read-only timeline; print/export for a date range.
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { LogIn, LogOut, Printer } from "lucide-react";
import type { FullLog } from "@/lib/daycare";
import { getInitials } from "@/lib/format";
import { todayKey, dayKey } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CalendarView } from "@/components/calendar-view";
import { DaycareLogForm } from "@/components/daycare/daycare-log-form";
import { LogTimeline } from "@/components/daycare/log-timeline";
import { MOOD_META } from "@/components/daycare/mood-selector";

type Student = { id: string; name: string; photo: string | null; className: string | null; checkInTime: string | null; checkOutTime: string | null; mood: string | null; status: string };

const statusBadge = (s: string) => (s === "CHECKED_IN" ? <Badge variant="success">Checked in</Badge> : s === "CHECKED_OUT" ? <Badge variant="secondary">Checked out</Badge> : <Badge variant="outline">Not arrived</Badge>);
const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null);

export function DaycareView({ studentsForHistory }: { studentsForHistory: { id: string; name: string }[] }) {
  return (
    <Tabs defaultValue="today" className="space-y-4">
      <TabsList>
        <TabsTrigger value="today">Today</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>
      <TabsContent value="today"><TodayTab /></TabsContent>
      <TabsContent value="history"><HistoryTab students={studentsForHistory} /></TabsContent>
    </Tabs>
  );
}

function TodayTab() {
  const [date, setDate] = useState(todayKey());
  const [students, setStudents] = useState<Student[]>([]);
  const [openLog, setOpenLog] = useState<Student | null>(null);
  const [log, setLog] = useState<FullLog | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/daycare/students?date=${date}`);
    if (res.ok) { const j = await res.json(); setStudents(j.students ?? []); }
  }, [date]);
  useEffect(() => { load(); }, [load]);

  async function checkInOut(s: Student, action: "check-in" | "check-out") {
    const res = await fetch(`/api/daycare/${action}/${s.id}`, { method: "POST" });
    if (res.status === 409) { const j = await res.json(); toast.error(j.error); return; }
    if (!res.ok) { toast.error("Action failed"); return; }
    toast.success(action === "check-in" ? "Checked in" : "Checked out");
    load();
  }

  async function openForm(s: Student) {
    const res = await fetch(`/api/daycare/log/${s.id}?date=${date}`);
    const j = await res.json();
    setLog(j); setOpenLog(s);
  }

  const isToday = date === todayKey();

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-44" />
        <span className="text-sm text-muted-foreground">{students.length} daycare students</span>
      </div>

      {students.length === 0 ? <p className="text-sm text-muted-foreground">No daycare-enrolled students.</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {students.map((s) => (
            <Card key={s.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-3">
                  {s.photo ? <img src={s.photo} alt={s.name} className="h-10 w-10 rounded-full object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{getInitials(s.name)}</div>}
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.className ?? "—"}</p></div>
                  {s.mood && <span className="text-xl" title={MOOD_META[s.mood]?.label}>{MOOD_META[s.mood]?.emoji}</span>}
                </div>
                <div className="flex items-center justify-between">
                  {statusBadge(s.status)}
                  {s.checkInTime && <span className="text-xs text-muted-foreground">{time(s.checkInTime)}{s.checkOutTime ? ` – ${time(s.checkOutTime)}` : ""}</span>}
                </div>
                {isToday && (
                  <div className="flex gap-2">
                    {s.status === "NOT_ARRIVED" && <Button size="sm" className="flex-1" onClick={() => checkInOut(s, "check-in")}><LogIn className="mr-1 h-4 w-4" /> Check in</Button>}
                    {s.status === "CHECKED_IN" && <Button size="sm" variant="outline" className="flex-1" onClick={() => checkInOut(s, "check-out")}><LogOut className="mr-1 h-4 w-4" /> Check out</Button>}
                    <Button size="sm" variant="secondary" className="flex-1" onClick={() => openForm(s)}>Log</Button>
                  </div>
                )}
                {!isToday && <Button size="sm" variant="secondary" className="w-full" onClick={() => openForm(s)}>View / edit log</Button>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={!!openLog} onOpenChange={(v) => { if (!v) { setOpenLog(null); load(); } }}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>{openLog?.name} · {date}</SheetTitle></SheetHeader>
          {openLog && log && <div className="mt-4"><DaycareLogForm key={openLog.id + date} studentId={openLog.id} dateKey={date} initial={log} /></div>}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function HistoryTab({ students }: { students: { id: string; name: string }[] }) {
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() + 1 });
  const [logs, setLogs] = useState<{ date: string; mood: string | null }[]>([]);
  const [dayLog, setDayLog] = useState<FullLog | null>(null);

  const load = useCallback(async () => {
    if (!studentId) return;
    const from = `${ym.year}-${String(ym.month).padStart(2, "0")}-01`;
    const to = `${ym.year}-${String(ym.month).padStart(2, "0")}-31`;
    const res = await fetch(`/api/daycare/history/${studentId}?from=${from}&to=${to}`);
    if (res.ok) { const j = await res.json(); setLogs(j.logs ?? []); }
  }, [studentId, ym]);
  useEffect(() => { load(); }, [load]);

  async function showDay(dateKey: string) {
    const res = await fetch(`/api/daycare/log/${studentId}?date=${dateKey}`);
    setDayLog(await res.json());
  }

  const moodColor = (mood: string | null) => mood === "HAPPY" ? "bg-emerald-500" : mood === "OKAY" ? "bg-amber-500" : mood === "UPSET" ? "bg-orange-500" : mood === "SICK" ? "bg-red-500" : "bg-muted";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={studentId} onValueChange={setStudentId}><SelectTrigger className="w-56"><SelectValue placeholder="Select student" /></SelectTrigger><SelectContent>{students.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
        {studentId && <Button variant="outline" size="sm" asChild><a href={`/print/daycare/${studentId}?from=${ym.year}-${String(ym.month).padStart(2, "0")}-01&to=${ym.year}-${String(ym.month).padStart(2, "0")}-31`} target="_blank"><Printer className="mr-1 h-4 w-4" /> Export</a></Button>}
      </div>

      <CalendarView
        year={ym.year} month={ym.month}
        onMonthChange={(year, month) => setYm({ year, month })}
        items={logs.map((l) => ({ ...l, date: l.date }))}
        renderDay={(_key, items) => items[0] ? <span className={`mx-auto mt-1 block h-2 w-2 rounded-full ${moodColor(items[0].mood)}`} /> : null}
        renderDetails={(key) => (
          <div>
            <Button size="sm" variant="outline" className="mb-2" onClick={() => showDay(key)}>Load {key}</Button>
            {dayLog && dayLog.date === key && <LogTimeline log={dayLog} />}
          </div>
        )}
      />
    </div>
  );
}
