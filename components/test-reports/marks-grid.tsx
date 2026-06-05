// The spreadsheet-style marks entry grid.
//
// PERFORMANCE — why not 50 controlled inputs in parent state? If the parent held
// a `marks[studentId]` object and every keystroke did setState, ALL 50 rows would
// re-render on every keystroke (new object identity). Instead:
//   • Each MarksRow is React.memo and owns its OWN local state → typing in row 7
//     re-renders ONLY row 7.
//   • The parent reads every row's value ONCE, on Save, via refs
//     (forwardRef + useImperativeHandle) — no live state lifting.
//   • Rows notify the parent only on a fill-state TRANSITION (empty↔filled) so the
//     "32/35 entered" counter updates without per-keystroke parent renders.
//
// FOCUS: pressing Enter focuses the next row's input (refs array + .focus()); Tab
// moves naturally. Marks over the total get a red border instantly.
"use client";

import { forwardRef, memo, useImperativeHandle, useRef, useState } from "react";
import { toast } from "sonner";
import { gradeFor } from "@/lib/grades";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type RosterStudent = { id: string; name: string; admissionNumber: string };
export type RowHandle = { getValue: () => { studentId: string; obtainedMarks: number; remarks: string } | null; focus: () => void };

const MarksRow = memo(
  forwardRef<RowHandle, { student: RosterStudent; totalMarks: number; initialMarks?: number; initialRemarks?: string; onEnter: () => void; onFillChange: (id: string, filled: boolean) => void }>(
    function MarksRow({ student, totalMarks, initialMarks, initialRemarks, onEnter, onFillChange }, ref) {
      const [marks, setMarks] = useState(initialMarks != null ? String(initialMarks) : "");
      const [remarks, setRemarks] = useState(initialRemarks ?? "");
      const inputRef = useRef<HTMLInputElement>(null);
      const wasFilled = useRef(marks !== "");

      const n = marks === "" ? null : Number(marks);
      const invalid = n != null && (Number.isNaN(n) || n > totalMarks || n < 0);
      const grade = n != null && !invalid ? gradeFor((n / totalMarks) * 100) : "";

      useImperativeHandle(ref, () => ({
        getValue: () => (marks === "" || invalid ? null : { studentId: student.id, obtainedMarks: Number(marks), remarks }),
        focus: () => inputRef.current?.focus(),
      }));

      function onChange(v: string) {
        setMarks(v);
        const filled = v !== "";
        if (filled !== wasFilled.current) { wasFilled.current = filled; onFillChange(student.id, filled); }
      }

      return (
        <tr className="border-b">
          <td className="sticky left-0 z-10 bg-background px-2 py-1 text-xs text-muted-foreground">{student.admissionNumber}</td>
          <td className="sticky left-16 z-10 min-w-32 bg-background px-2 py-1 text-sm">{student.name}</td>
          <td className="px-2 py-1">
            <input
              ref={inputRef}
              type="number"
              value={marks}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onEnter(); } }}
              className={cn("w-20 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring", invalid && "border-destructive ring-1 ring-destructive")}
            />
          </td>
          <td className="px-2 py-1 text-center text-sm font-medium">{grade}</td>
          <td className="px-2 py-1"><input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Remarks" className="w-40 rounded border px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring" /></td>
        </tr>
      );
    }
  )
);

export function MarksGrid({ roster, totalMarks, existing, onSaved, save }: { roster: RosterStudent[]; totalMarks: number; existing: Map<string, { obtainedMarks: number; remarks?: string }>; onSaved: () => void; save: (records: { studentId: string; obtainedMarks: number; remarks: string }[]) => Promise<boolean> }) {
  const rowRefs = useRef<(RowHandle | null)[]>([]);
  const [filled, setFilled] = useState<Set<string>>(new Set(Array.from(existing.keys())));
  const [busy, setBusy] = useState(false);

  function onFillChange(id: string, isFilled: boolean) {
    setFilled((s) => { const n = new Set(s); isFilled ? n.add(id) : n.delete(id); return n; });
  }

  async function saveAll() {
    const records = rowRefs.current.map((r) => r?.getValue()).filter((x): x is { studentId: string; obtainedMarks: number; remarks: string } => !!x);
    if (records.length === 0) return toast.error("No marks entered");
    setBusy(true);
    const ok = await save(records);
    setBusy(false);
    if (ok) { toast.success(`Saved ${records.length} students`); onSaved(); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{filled.size}/{roster.length} students entered</p>
        <Button onClick={saveAll} disabled={busy}>{busy ? "Saving…" : "Save All"}</Button>
      </div>
      <div className="overflow-x-auto rounded-md border">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="sticky left-0 z-10 bg-muted/40 px-2 py-2 text-left text-xs">Adm.</th>
              <th className="sticky left-16 z-10 bg-muted/40 px-2 py-2 text-left text-xs">Name</th>
              <th className="px-2 py-2 text-left text-xs">Marks /{totalMarks}</th>
              <th className="px-2 py-2 text-center text-xs">Grade</th>
              <th className="px-2 py-2 text-left text-xs">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {roster.map((s, i) => (
              <MarksRow
                key={s.id}
                ref={(el) => { rowRefs.current[i] = el; }}
                student={s}
                totalMarks={totalMarks}
                initialMarks={existing.get(s.id)?.obtainedMarks}
                initialRemarks={existing.get(s.id)?.remarks}
                onEnter={() => rowRefs.current[i + 1]?.focus()}
                onFillChange={onFillChange}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
