// Principal timetable builder. Pick class + section + year → a grid of periods ×
// days. Click a CLASS cell to assign a subject + teacher. The server re-checks
// for teacher double-bookings and returns 409 with the clashing slot(s), which we
// surface as a toast (the conflict is never silently saved).
"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Settings, Copy, Printer, AlertTriangle } from "lucide-react";
import type { ClassWithSections } from "@/lib/students";
import { cellKey, type Day, type Entry, type Period } from "@/lib/timetable";
import { subjectColor } from "@/lib/colors";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { TimetableGrid } from "@/components/timetable/timetable-grid";
import { PeriodSettings } from "@/components/timetable/period-settings";

type Opt = { id: string; name: string };
type YearOpt = { id: string; name: string; isActive: boolean };

export function TimetableBuilder({ classes, years, teachers, defaultYearId }: { classes: ClassWithSections[]; years: YearOpt[]; teachers: Opt[]; defaultYearId: string }) {
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const sections = classes.find((c) => c.id === classId)?.sections ?? [];
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? "");
  const [academicYearId, setAcademicYearId] = useState(defaultYearId || years[0]?.id || "");

  const [periods, setPeriods] = useState<Period[]>([]);
  const [byCell, setByCell] = useState<Record<string, Entry>>({});
  const [subjects, setSubjects] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editing, setEditing] = useState<{ day: Day; period: Period } | null>(null);

  // Load subjects for the chosen class (assignable subjects depend on the class).
  useEffect(() => {
    if (!classId) return;
    fetch(`/api/subjects?classId=${classId}`).then((r) => r.json()).then((j) => setSubjects(j.subjects ?? j ?? [])).catch(() => setSubjects([]));
  }, [classId]);

  const loadGrid = useCallback(async () => {
    if (!classId || !sectionId || !academicYearId) return;
    setLoading(true);
    const res = await fetch(`/api/timetable?classId=${classId}&sectionId=${sectionId}&academicYearId=${academicYearId}`);
    setLoading(false);
    if (!res.ok) { toast.error("Failed to load timetable"); return; }
    const j = await res.json();
    setPeriods(j.periods);
    setByCell(j.byCell);
  }, [classId, sectionId, academicYearId]);

  useEffect(() => { loadGrid(); }, [loadGrid]);

  // When class changes, reset the section to the first of the new class.
  function onClassChange(v: string) {
    setClassId(v);
    const first = classes.find((c) => c.id === v)?.sections[0]?.id ?? "";
    setSectionId(first);
  }

  async function saveCell(day: Day, periodNumber: number, subjectId: string | null, teacherId: string | null) {
    const res = await fetch("/api/timetable", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId, sectionId, academicYearId, dayOfWeek: day, periodNumber, subjectId, teacherId }),
    });
    if (res.status === 409) {
      const j = await res.json();
      const where = (j.conflict ?? []).map((c: { className: string; sectionName: string }) => `${c.className}-${c.sectionName}`).join(", ");
      toast.error(`Teacher is already booked this period in ${where}`);
      return false;
    }
    if (!res.ok) { toast.error("Failed to save"); return false; }
    await loadGrid();
    return true;
  }

  async function copyToSection(targetId: string) {
    const res = await fetch("/api/timetable/copy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId, fromSectionId: sectionId, toSectionId: targetId, academicYearId }) });
    if (!res.ok) { toast.error("Copy failed"); return; }
    const j = await res.json();
    toast.success(`Copied ${j.copied} periods. Check the conflicts report.`);
  }

  const printHref = `/print/timetable?classId=${classId}&sectionId=${sectionId}&academicYearId=${academicYearId}`;

  return (
    <div className="space-y-4">
      {/* Selectors + actions */}
      <Card>
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="space-y-1"><Label className="text-xs">Class</Label>
            <Select value={classId} onValueChange={onClassChange}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Section</Label>
            <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}><SelectTrigger className="w-28"><SelectValue placeholder="Section" /></SelectTrigger><SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="space-y-1"><Label className="text-xs">Year</Label>
            <Select value={academicYearId} onValueChange={setAcademicYearId}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent>{years.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}><Settings className="mr-1 h-4 w-4" /> Bell schedule</Button>
            {sections.length > 1 && (
              <Select onValueChange={copyToSection}>
                <SelectTrigger className="h-9 w-auto gap-1"><Copy className="h-4 w-4" /><span className="text-sm">Copy to…</span></SelectTrigger>
                <SelectContent>{sections.filter((s) => s.id !== sectionId).map((s) => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}</SelectContent>
              </Select>
            )}
            <Button variant="outline" size="sm" asChild><a href={printHref} target="_blank"><Printer className="mr-1 h-4 w-4" /> Print</a></Button>
          </div>
        </CardContent>
      </Card>

      {/* Grid */}
      <Card>
        <CardContent className="p-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <TimetableGrid
              periods={periods}
              renderCell={(day, period) => {
                const e = byCell[cellKey(day, period.periodNumber)];
                const color = subjectColor(e?.subjectName);
                return (
                  <button
                    onClick={() => setEditing({ day, period })}
                    className={`flex h-full w-full flex-col items-start rounded p-1.5 text-left transition hover:ring-2 hover:ring-primary/40 ${e ? `${color.bg} ${color.text} border ${color.border}` : "border border-dashed text-muted-foreground hover:bg-muted"}`}
                  >
                    {e ? (
                      <>
                        <span className="text-xs font-semibold leading-tight">{e.subjectName ?? "—"}</span>
                        <span className={`mt-0.5 text-[10px] leading-tight ${e.teacherActive ? "opacity-80" : "text-destructive"}`}>
                          {e.teacherName ?? "Unassigned"}
                          {!e.teacherActive && " (inactive)"}
                        </span>
                      </>
                    ) : (
                      <span className="text-[10px]">+ Add</span>
                    )}
                  </button>
                );
              }}
            />
          )}
        </CardContent>
      </Card>

      <PeriodSettings open={settingsOpen} onOpenChange={setSettingsOpen} periods={periods} onSaved={(p) => { setPeriods(p); loadGrid(); }} />

      {editing && (
        <CellEditor
          day={editing.day}
          period={editing.period}
          current={byCell[cellKey(editing.day, editing.period.periodNumber)] ?? null}
          subjects={subjects}
          teachers={teachers}
          onClose={() => setEditing(null)}
          onSave={async (subjectId, teacherId) => {
            const ok = await saveCell(editing.day, editing.period.periodNumber, subjectId, teacherId);
            if (ok) setEditing(null);
          }}
        />
      )}
    </div>
  );
}

// Per-cell editor dialog: choose subject + teacher, or clear the slot.
function CellEditor({ day, period, current, subjects, teachers, onClose, onSave }: {
  day: Day; period: Period; current: Entry | null; subjects: Opt[]; teachers: Opt[];
  onClose: () => void; onSave: (subjectId: string | null, teacherId: string | null) => void;
}) {
  const [subjectId, setSubjectId] = useState(current?.subjectId ?? "");
  const [teacherId, setTeacherId] = useState(current?.teacherId ?? "");
  const CLEAR = "__none__";

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{day} · {period.label} <span className="text-sm font-normal text-muted-foreground">({period.startTime}–{period.endTime})</span></DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Subject</Label>
            <Select value={subjectId || CLEAR} onValueChange={(v) => setSubjectId(v === CLEAR ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={CLEAR}>— None —</SelectItem>
                {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Teacher</Label>
            <Select value={teacherId || CLEAR} onValueChange={(v) => setTeacherId(v === CLEAR ? "" : v)}>
              <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={CLEAR}>— None —</SelectItem>
                {teachers.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {current && !current.teacherActive && (
              <p className="flex items-center gap-1 text-xs text-destructive"><AlertTriangle className="h-3 w-3" /> Current teacher is deactivated. Reassign to an active teacher.</p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" className="text-destructive" onClick={() => onSave(null, null)}>Clear slot</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSave(subjectId || null, teacherId || null)}>Save</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
