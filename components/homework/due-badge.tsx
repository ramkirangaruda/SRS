// A small colored badge showing the due-date countdown ("Due in 2 days",
// "Overdue by 3 days"…). The label/tone come from dueInfo, which computes the
// countdown against the user's local calendar day (see lib/homework-format).
import { dueInfo, DUE_TONE_CLASS } from "@/lib/homework-format";

export function DueBadge({ dueDate }: { dueDate: string | Date }) {
  const info = dueInfo(dueDate);
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${DUE_TONE_CLASS[info.tone]}`}>
      {info.label}
    </span>
  );
}
