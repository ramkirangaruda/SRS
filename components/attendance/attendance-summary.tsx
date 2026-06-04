// Monthly attendance summary: a percentage ring + the four count chips. Plain
// presentational component, reused by the student detail tab and parent views.
import { CircularProgress } from "@/components/fees/circular-progress";
import type { AttendanceCounts } from "@/lib/attendance-status";

export function AttendanceSummary({
  counts,
  percentage,
}: {
  counts: AttendanceCounts;
  percentage: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <CircularProgress value={percentage} size={80} />
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
        <Chip label="Present" value={counts.present} dot="bg-green-500" />
        <Chip label="Absent" value={counts.absent} dot="bg-red-500" />
        <Chip label="Late" value={counts.late} dot="bg-yellow-400" />
        <Chip label="Half Day" value={counts.halfDay} dot="bg-orange-500" />
      </div>
    </div>
  );
}

function Chip({ label, value, dot }: { label: string; value: number; dot: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
