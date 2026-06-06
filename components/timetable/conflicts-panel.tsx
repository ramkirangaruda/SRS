// Whole-school conflict report. Lists every teacher double-booking for the year
// so the principal can fix clashes (often created by copy-to-section).
"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { DAY_LABELS, type Day, type Conflict } from "@/lib/timetable";
import { Card, CardContent } from "@/components/ui/card";

export function ConflictsPanel({ academicYearId }: { academicYearId: string }) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/timetable/conflicts?academicYearId=${academicYearId}`)
      .then((r) => r.json())
      .then((j) => setConflicts(j.conflicts ?? []))
      .finally(() => setLoading(false));
  }, [academicYearId]);

  if (loading) return <p className="text-sm text-muted-foreground">Checking for conflicts…</p>;

  if (conflicts.length === 0) {
    return (
      <Card><CardContent className="flex items-center gap-2 p-4 text-sm text-emerald-700">
        <CheckCircle2 className="h-5 w-5" /> No teacher double-bookings. Every teacher is in at most one place each period.
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">{conflicts.length} conflict{conflicts.length > 1 ? "s" : ""} found — a teacher assigned to two slots at the same time.</p>
      {conflicts.map((c, i) => (
        <Card key={i} className="border-destructive/50">
          <CardContent className="flex items-start gap-3 p-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-medium">{c.teacherName} · {DAY_LABELS[c.dayOfWeek as Day]} · Period {c.periodNumber}</p>
              <p className="text-muted-foreground">Booked in: {c.slots.map((s) => `${s.className}-${s.sectionName}`).join(" and ")}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
