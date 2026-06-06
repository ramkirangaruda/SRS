// Shared timetable grid shell. Rows = periods (the bell schedule), columns =
// days (Mon–Sat). Used by the principal builder, the teacher view, the parent
// view and the print page — they differ only in what each cell renders, which
// they supply via the `renderCell` render-prop (same pattern as CalendarView /
// MediaGrid elsewhere in the app).
"use client";

import { DAYS, DAY_LABELS, type Day, type Period } from "@/lib/timetable";
import { cn } from "@/lib/utils";

export function TimetableGrid({
  periods,
  renderCell,
  highlightDay,
  highlightPeriod,
  compact,
}: {
  periods: Period[];
  renderCell: (day: Day, period: Period) => React.ReactNode;
  highlightDay?: string | null; // e.g. today → tint that column
  highlightPeriod?: number | null; // e.g. current period → tint that row
  compact?: boolean;
}) {
  if (periods.length === 0) {
    return <p className="text-sm text-muted-foreground">No periods defined yet. Set up the bell schedule first.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-32 border bg-muted p-2 text-left font-medium">Period</th>
            {DAYS.map((d) => (
              <th
                key={d}
                className={cn("border bg-muted p-2 text-center font-medium", highlightDay === d && "bg-primary/15")}
              >
                {DAY_LABELS[d]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => {
            // BREAK / ASSEMBLY rows span the whole width — no per-day cells.
            if (p.type !== "CLASS") {
              return (
                <tr key={p.id}>
                  <td className="sticky left-0 z-10 border bg-muted/50 p-2 align-top">
                    <div className="font-medium">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.startTime}–{p.endTime}</div>
                  </td>
                  <td colSpan={DAYS.length} className="border bg-amber-50 p-2 text-center text-xs font-medium uppercase tracking-wide text-amber-700">
                    {p.label}
                  </td>
                </tr>
              );
            }
            return (
              <tr key={p.id} className={cn(highlightPeriod === p.periodNumber && "bg-primary/5")}>
                <td className="sticky left-0 z-10 border bg-muted/50 p-2 align-top">
                  <div className="font-medium">{p.label}</div>
                  <div className="text-xs text-muted-foreground">{p.startTime}–{p.endTime}</div>
                </td>
                {DAYS.map((d) => (
                  <td
                    key={d}
                    className={cn(
                      "border p-1 align-top",
                      compact ? "h-12" : "h-16",
                      highlightDay === d && "bg-primary/5"
                    )}
                  >
                    {renderCell(d, p)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
