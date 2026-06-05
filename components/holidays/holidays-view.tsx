// Holidays screen on CalendarView. Here renderDay/​dayClassName SHADE the whole
// cell (light green) for holiday days — the same calendar, a different render
// prop than Events' dots. Adds a year-at-a-glance toggle, a "Next Holiday"
// countdown card, the full list, and (principal) add + CSV import.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Upload, Pencil, Trash2, PartyPopper } from "lucide-react";
import type { HolidayItem } from "@/lib/holidays";
import { CalendarView } from "@/components/calendar-view";
import { YearAtAGlance } from "@/components/holidays/year-at-a-glance";
import { HolidayForm } from "@/components/holidays/holiday-form";
import { CsvImport } from "@/components/holidays/csv-import";
import { dayKey, todayKey, daysBetweenKeys, formatKey, keysBetween } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function HolidaysView({ editable }: { editable: boolean }) {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [holidays, setHolidays] = useState<HolidayItem[]>([]);
  const [yearView, setYearView] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [csvOpen, setCsvOpen] = useState(false);
  const [editing, setEditing] = useState<HolidayItem | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/holidays");
    const json = await res.json();
    setHolidays(json.data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  // Set of every holiday day-key (expanding multi-day breaks). O(1) cell lookups.
  const holidayKeys = useMemo(() => {
    const s = new Set<string>();
    for (const h of holidays) for (const k of keysBetween(dayKey(h.date), h.endDate ? dayKey(h.endDate) : dayKey(h.date))) s.add(k);
    return s;
  }, [holidays]);

  // Nearest holiday today-or-later, for the countdown card.
  const next = useMemo(() => {
    const t = todayKey();
    const upcoming = holidays.filter((h) => (h.endDate ? dayKey(h.endDate) : dayKey(h.date)) >= t).sort((a, b) => dayKey(a.date).localeCompare(dayKey(b.date)));
    if (upcoming.length === 0) return null;
    const h = upcoming[0];
    return { h, inDays: Math.max(0, daysBetweenKeys(t, dayKey(h.date))) };
  }, [holidays]);

  async function del(id: string) {
    const res = await fetch(`/api/holidays/${id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Delete failed");
    toast.success("Deleted"); load();
  }

  const renderDay = (key: string, items: HolidayItem[]) => (
    items.length > 0 ? <span className="line-clamp-2 text-[9px] font-medium leading-tight text-green-800">{items[0].name}</span> : null
  );
  const renderDetails = (key: string, items: HolidayItem[]) => (
    <div className="space-y-2">
      {editable && <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /> Add holiday</Button>}
      {items.length === 0 ? <p className="text-sm text-muted-foreground">No holiday.</p> : items.map((h) => (
        <div key={h.id} className="rounded-md border p-2 text-sm">
          <p className="font-medium">{h.name}</p>
          {h.description && <p className="text-muted-foreground">{h.description}</p>}
          {editable && <div className="mt-1 flex gap-2">
            <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => { setEditing(h); setFormOpen(true); }}><Pencil className="h-3 w-3" /> Edit</Button>
            <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" onClick={() => del(h.id)}><Trash2 className="h-3 w-3" /> Delete</Button>
          </div>}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Holidays</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setYearView(!yearView)}>{yearView ? "Month view" : "Year view"}</Button>
          {editable && <>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setCsvOpen(true)}><Upload className="h-4 w-4" /><span className="hidden sm:inline">Import CSV</span></Button>
            <Button size="sm" className="gap-1" onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add</span></Button>
          </>}
        </div>
      </div>

      {/* Next Holiday countdown */}
      {next && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="flex items-center gap-3 p-4">
            <PartyPopper className="h-6 w-6 text-green-700" />
            <div>
              <p className="text-sm text-green-800">Next Holiday</p>
              <p className="font-semibold text-green-900">{next.h.name} {next.inDays === 0 ? "is today!" : `in ${next.inDays} day${next.inDays === 1 ? "" : "s"}`}</p>
              <p className="text-xs text-green-700">{formatKey(dayKey(next.h.date))}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {yearView ? (
        <YearAtAGlance year={year} holidayKeys={holidayKeys} />
      ) : (
        <CalendarView
          year={year} month={month}
          onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
          items={holidays}
          renderDay={renderDay}
          renderDetails={renderDetails}
          dayClassName={(key, items) => (items.length > 0 ? "bg-green-50" : undefined)}
        />
      )}

      {/* Full list */}
      <div>
        <h2 className="mb-2 text-lg font-semibold">All Holidays</h2>
        {holidays.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No holidays added.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {holidays.map((h) => (
              <Card key={h.id}><CardContent className="flex items-center justify-between gap-2 p-3">
                <div><p className="font-medium">{h.name}</p><p className="text-xs text-muted-foreground">{formatKey(dayKey(h.date))}{h.endDate ? ` – ${formatKey(dayKey(h.endDate))}` : ""}</p></div>
                <Badge variant="secondary">{h.type}</Badge>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>

      {editable && <>
        <HolidayForm open={formOpen} onOpenChange={setFormOpen} initial={editing ?? undefined} onSaved={load} />
        <CsvImport open={csvOpen} onOpenChange={setCsvOpen} onSaved={load} />
      </>}
    </div>
  );
}
