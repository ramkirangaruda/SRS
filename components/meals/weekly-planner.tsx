// The weekly meal planner: Mon–Sat columns × Breakfast/Lunch/Snack rows, every
// cell editable. WHY SAVE THE WHOLE WEEK AT ONCE (not cell-by-cell): the cook
// fills the grid, then hits Save once → a single POST upserts all six days in one
// transaction. That's fewer requests, atomic (no half-saved week), and lets us
// "Copy previous week" as one clone operation. Items are comma-separated in each
// cell. Scrolls horizontally on mobile.
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Save, Copy, Printer } from "lucide-react";
import type { MealMenu } from "@/lib/meals";
import { formatKey, parseKey, dayKey } from "@/lib/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Day = { date: string; menu: MealMenu };
const MEALS: (keyof MealMenu)[] = ["breakfast", "lunch", "snack"];
const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function shiftWeek(mondayKey: string, weeks: number): string {
  const { y, m, d } = parseKey(mondayKey);
  return dayKey(new Date(Date.UTC(y, m - 1, d + weeks * 7)));
}

export function WeeklyPlanner({ open, onOpenChange, type, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; type: string; onSaved: () => void }) {
  const [monday, setMonday] = useState<string>(new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState<Day[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (weekKey: string) => {
    const res = await fetch(`/api/meals/week?week=${weekKey}&type=${type}`);
    const json = await res.json();
    setMonday(json.monday);
    setDays(json.days);
  }, [type]);

  useEffect(() => { if (open) load(new Date().toISOString().slice(0, 10)); }, [open, load]);

  function setCell(dayIdx: number, meal: keyof MealMenu, value: string) {
    setDays((prev) => prev.map((d, i) => (i === dayIdx ? { ...d, menu: { ...d.menu, [meal]: value.split(",").map((s) => s.trim()).filter(Boolean) } } : d)));
  }

  async function save() {
    setBusy(true);
    const res = await fetch("/api/meals/week", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type, days }) });
    setBusy(false);
    if (!res.ok) return toast.error("Save failed");
    toast.success("Week saved");
    onSaved();
  }

  async function copyPrev() {
    setBusy(true);
    const res = await fetch("/api/meals/copy-week", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ from: shiftWeek(monday, -1), to: monday, type }) });
    setBusy(false);
    if (!res.ok) return toast.error("Copy failed");
    toast.success("Copied previous week");
    load(monday);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader><DialogTitle>Plan Meals — {type === "DAYCARE" ? "Daycare" : "School"}</DialogTitle></DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => load(shiftWeek(monday, -1))}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium">{days[0] && days[5] ? `${formatKey(days[0].date)} – ${formatKey(days[5].date)}` : "…"}</span>
            <Button variant="ghost" size="icon" onClick={() => load(shiftWeek(monday, 1))}><ChevronRight className="h-4 w-4" /></Button>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="gap-1" onClick={copyPrev} disabled={busy}><Copy className="h-4 w-4" /> Copy prev week</Button>
            <Button size="sm" variant="outline" className="gap-1 print:hidden" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
            <Button size="sm" className="gap-1" onClick={save} disabled={busy}><Save className="h-4 w-4" /> Save</Button>
          </div>
        </div>

        {/* The grid: scrolls horizontally on small screens. */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr>
                <th className="border p-2 text-left text-xs text-muted-foreground"></th>
                {days.map((d, i) => (
                  <th key={d.date} className="border p-2 text-center text-xs font-medium">
                    {WD[i]}<span className="block text-[10px] text-muted-foreground">{parseKey(d.date).d}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEALS.map((meal) => (
                <tr key={meal}>
                  <td className="border p-2 align-top text-xs font-semibold capitalize">{meal}</td>
                  {days.map((d, i) => (
                    <td key={d.date} className="border p-1 align-top">
                      <textarea
                        value={d.menu[meal].join(", ")}
                        onChange={(e) => setCell(i, meal, e.target.value)}
                        rows={2}
                        placeholder="items, comma-separated"
                        className="w-full resize-none rounded border-0 bg-transparent p-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">Tip: separate items with commas. Empty cells are cleared on save.</p>
      </DialogContent>
    </Dialog>
  );
}
