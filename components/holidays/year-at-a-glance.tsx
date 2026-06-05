// Year-at-a-glance: 12 compact mini-months with holiday days shaded.
//
// EFFICIENCY: we don't render 365 full calendar cells with per-cell components or
// queries. We precompute ONE Set of holiday day-keys; each mini-cell is just a
// number that does an O(1) Set.has() check to decide whether to shade. So the
// whole year is a few hundred tiny <span>s — cheap to render. Responsive: 2
// columns on mobile (2x6), 3 on desktop (3x4).
import { buildMonthGrid, shortMonth } from "@/lib/calendar";

export function YearAtAGlance({ year, holidayKeys }: { year: number; holidayKeys: Set<string> }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
        const grid = buildMonthGrid(year, m);
        return (
          <div key={m} className="rounded-md border p-2">
            <p className="mb-1 text-center text-xs font-semibold">{shortMonth(m)}</p>
            <div className="grid grid-cols-7 gap-0.5">
              {grid.map((cell, idx) => (
                <span
                  key={idx}
                  className={`flex aspect-square items-center justify-center rounded-[2px] text-[9px] ${
                    !cell.inMonth ? "text-transparent" : holidayKeys.has(cell.key) ? "bg-green-200 font-medium text-green-900" : "text-muted-foreground"
                  }`}
                >
                  {cell.day}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
