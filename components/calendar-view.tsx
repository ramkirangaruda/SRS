// CalendarView — ONE reusable calendar used by Events, Holidays, and Meals.
//
// It owns LAYOUT + INTERACTION (the month grid, prev/next nav, today highlight,
// month/list toggle, day selection, the detail panel on desktop / bottom sheet
// on mobile). It knows NOTHING about events vs holidays vs meals.
//
// Callers customize it through two patterns:
//  • CONTROLLED month: `month`/`year` + `onMonthChange` are owned by the parent,
//    so the parent can refetch data when the month changes.
//  • RENDER PROPS: `renderDay(key, items)` decides what goes in each cell, and
//    `renderDetails(key, items)` decides the day-detail content. The calendar
//    calls these — once per cell / on selection — but the PARENT decides the
//    markup. That's how the same grid shows dots, shading, or meal info.
"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import { buildMonthGrid, dayKey, todayKey, monthLabel, addMonths, formatKey, WEEKDAYS } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// The minimum an item needs: a `date` (ISO or key). `endDate` is optional and,
// when present, the item is spread across every day in the range.
export type CalendarItem = { date: string; endDate?: string | null };

type Props<T extends CalendarItem> = {
  year: number;
  month: number; // 1..12
  onMonthChange: (year: number, month: number) => void;
  items: T[];
  renderDay: (key: string, items: T[]) => React.ReactNode;
  renderDetails?: (key: string, items: T[]) => React.ReactNode;
  renderListItem?: (item: T) => React.ReactNode;
  /** extra cell classes per day (e.g. full-cell holiday shading). */
  dayClassName?: (key: string, items: T[]) => string | undefined;
  headerActions?: React.ReactNode;
  /** square cells on desktop; set false for content-heavy cells (meals). */
  squareCells?: boolean;
};

export function CalendarView<T extends CalendarItem>({
  year, month, onMonthChange, items, renderDay, renderDetails, renderListItem, dayClassName, headerActions, squareCells = true,
}: Props<T>) {
  const [view, setView] = useState<"month" | "list">("month");
  const [selected, setSelected] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const today = todayKey();

  // Map dayKey -> items on that day. Multi-day items appear on each covered day.
  const byDay = useMemo(() => {
    const map = new Map<string, T[]>();
    for (const it of items) {
      const start = dayKey(it.date);
      const end = it.endDate ? dayKey(it.endDate) : start;
      let cur = new Date(`${start}T00:00:00Z`).getTime();
      const last = new Date(`${end}T00:00:00Z`).getTime();
      let guard = 0;
      while (cur <= last && guard < 400) {
        const k = dayKey(new Date(cur));
        (map.get(k) ?? map.set(k, []).get(k)!).push(it);
        cur += 86400000;
        guard++;
      }
    }
    return map;
  }, [items]);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Items that fall within the displayed month, sorted — for list view.
  const monthItems = useMemo(() => {
    const prefix = `${year}-${String(month).padStart(2, "0")}`;
    return items
      .filter((it) => dayKey(it.date).startsWith(prefix) || (it.endDate && dayKey(it.endDate).startsWith(prefix)))
      .sort((a, b) => dayKey(a.date).localeCompare(dayKey(b.date)));
  }, [items, year, month]);

  function selectDay(key: string) {
    setSelected(key);
    setSheetOpen(true); // opens the bottom sheet on mobile; panel shows on desktop
  }

  const prev = () => { const { year: y, month: m } = addMonths(year, month, -1); onMonthChange(y, m); };
  const next = () => { const { year: y, month: m } = addMonths(year, month, 1); onMonthChange(y, m); };

  return (
    <div className="space-y-3">
      {/* Header: nav + month label + view toggle + actions */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={prev} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
          <span className="min-w-40 text-center font-semibold">{monthLabel(year, month)}</span>
          <Button variant="ghost" size="icon" onClick={next} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1" onClick={() => setView(view === "month" ? "list" : "month")}>
            {view === "month" ? <><List className="h-4 w-4" /> List</> : <><CalendarDays className="h-4 w-4" /> Month</>}
          </Button>
          {headerActions}
        </div>
      </div>

      <div className="gap-4 md:grid md:grid-cols-[1fr_320px]">
        {/* LEFT: month grid or list */}
        <div>
          {view === "month" ? (
            <div className="rounded-lg border">
              <div className="grid grid-cols-7 border-b">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="p-2 text-center text-xs font-medium text-muted-foreground">{w}</div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {grid.map((cell, i) => {
                  const dayItems = byDay.get(cell.key) ?? [];
                  const isToday = cell.key === today;
                  const isSelected = cell.key === selected;
                  return (
                    <button
                      key={cell.key + i}
                      onClick={() => selectDay(cell.key)}
                      className={cn(
                        "flex flex-col items-stretch border-b border-r p-1 text-left align-top last:border-r-0",
                        squareCells && "aspect-square",
                        "min-h-14 sm:min-h-16",
                        !cell.inMonth && "bg-muted/30 text-muted-foreground",
                        isSelected && "ring-2 ring-inset ring-primary",
                        "hover:bg-accent/50",
                        dayClassName?.(cell.key, dayItems)
                      )}
                    >
                      <span className={cn("mb-0.5 inline-flex h-5 w-5 items-center justify-center self-start rounded-full text-xs", isToday && "bg-primary font-semibold text-primary-foreground")}>
                        {cell.day}
                      </span>
                      <div className="min-h-0 flex-1 overflow-hidden">{renderDay(cell.key, dayItems)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {monthItems.length === 0 ? (
                <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">Nothing this month.</p>
              ) : (
                monthItems.map((it, i) => (
                  <div key={i} role="button" onClick={() => selectDay(dayKey(it.date))}>
                    {renderListItem ? renderListItem(it) : (
                      <div className="rounded-md border p-3 text-sm">{formatKey(dayKey(it.date))}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* RIGHT (desktop only): detail side panel for the selected day */}
        {renderDetails && (
          <aside className="hidden rounded-lg border p-3 md:block">
            {selected ? (
              <>
                <p className="mb-2 font-semibold">{formatKey(selected)}</p>
                {renderDetails(selected, byDay.get(selected) ?? [])}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Select a date to see details.</p>
            )}
          </aside>
        )}
      </div>

      {/* MOBILE: bottom sheet with the selected day's details */}
      {renderDetails && (
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="md:hidden">
            <SheetHeader>
              <SheetTitle>{selected ? formatKey(selected) : "Details"}</SheetTitle>
            </SheetHeader>
            <div className="mt-3">{selected && renderDetails(selected, byDay.get(selected) ?? [])}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
