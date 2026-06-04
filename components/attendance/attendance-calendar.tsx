// A month calendar "heat map" for attendance. Plain component (works in Server
// and Client). HOW IT'S GENERATED: we lay out a 7-column grid, add blank cells
// to align the 1st onto its weekday, then for each day look up its status in the
// statusByDate map and color the cell. So the calendar is just the attendance
// data projected onto a date grid — no extra queries, pure rendering.
import { STATUS_DOT, STATUS_LABEL, type AttendanceStatus } from "@/lib/attendance-status";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const pad = (n: number) => String(n).padStart(2, "0");

export function AttendanceCalendar({
  year,
  month, // 1..12
  statusByDate,
  noteByDate = {},
}: {
  year: number;
  month: number;
  statusByDate: Record<string, AttendanceStatus>;
  noteByDate?: Record<string, string | null>;
}) {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  // Weekday (0=Sun) that the 1st falls on — how many leading blanks we need.
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

  const cells: ({ day: number; dateKey: string } | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, dateKey: `${year}-${pad(month)}-${pad(day)}` });
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div key={w} className="pb-1 text-center text-xs font-medium text-muted-foreground">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`b${i}`} />;
          const status = statusByDate[cell.dateKey];
          const note = noteByDate[cell.dateKey];
          // Touch-friendly square: min height, centered number, colored if marked.
          return (
            <div
              key={cell.dateKey}
              title={status ? `${STATUS_LABEL[status]}${note ? ` — ${note}` : ""}` : "No record"}
              className={`flex aspect-square min-h-9 items-center justify-center rounded-md text-xs font-medium ${
                status ? `${STATUS_DOT[status]} text-white` : "bg-muted text-muted-foreground"
              }`}
            >
              {cell.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}
