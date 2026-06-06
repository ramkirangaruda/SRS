// Bell-schedule editor (slide-over). The principal defines the period structure
// here ONCE for the whole school: number, label, start/end time and type
// (CLASS / BREAK / ASSEMBLY). Saving replaces the schedule via PUT.
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import type { Period } from "@/lib/timetable";
import { PERIOD_TYPES } from "@/lib/timetable";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Row = { periodNumber: number; label: string; startTime: string; endTime: string; type: string };

export function PeriodSettings({ open, onOpenChange, periods, onSaved }: { open: boolean; onOpenChange: (v: boolean) => void; periods: Period[]; onSaved: (p: Period[]) => void }) {
  // Seed with the current schedule, or a sensible single starter row.
  const [rows, setRows] = useState<Row[]>(
    periods.length ? periods.map((p) => ({ periodNumber: p.periodNumber, label: p.label, startTime: p.startTime, endTime: p.endTime, type: p.type })) : [{ periodNumber: 1, label: "Period 1", startTime: "09:00", endTime: "09:45", type: "CLASS" }]
  );
  const [busy, setBusy] = useState(false);

  function update(i: number, field: keyof Row, value: string) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: field === "periodNumber" ? Number(value) : value } : row)));
  }
  function addRow() {
    setRows((r) => [...r, { periodNumber: r.length + 1, label: `Period ${r.length + 1}`, startTime: "", endTime: "", type: "CLASS" }]);
  }
  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i).map((row, idx) => ({ ...row, periodNumber: idx + 1 })));
  }

  async function save() {
    setBusy(true);
    const res = await fetch("/api/timetable/periods", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ periods: rows }) });
    setBusy(false);
    if (!res.ok) { toast.error("Failed to save schedule"); return; }
    const j = await res.json();
    toast.success("Bell schedule saved");
    onSaved(j.periods);
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Bell schedule</SheetTitle>
          <SheetDescription>Define the periods for the whole school. Times use 24-hour HH:MM.</SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {rows.map((row, i) => (
            <div key={i} className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">#{row.periodNumber}</span>
                <Button variant="ghost" size="sm" onClick={() => removeRow(i)} className="h-7 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="col-span-2 space-y-1"><Label className="text-xs">Label</Label><Input value={row.label} onChange={(e) => update(i, "label", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">Start</Label><Input placeholder="09:00" value={row.startTime} onChange={(e) => update(i, "startTime", e.target.value)} /></div>
                <div className="space-y-1"><Label className="text-xs">End</Label><Input placeholder="09:45" value={row.endTime} onChange={(e) => update(i, "endTime", e.target.value)} /></div>
                <div className="col-span-2 space-y-1">
                  <Label className="text-xs">Type</Label>
                  <Select value={row.type} onValueChange={(v) => update(i, "type", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PERIOD_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" onClick={addRow} className="w-full"><Plus className="mr-1 h-4 w-4" /> Add period</Button>
        </div>

        <div className="mt-6 flex gap-2">
          <Button onClick={save} disabled={busy} className="flex-1">{busy ? "Saving…" : "Save schedule"}</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
