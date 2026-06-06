// Read-only timeline of a daycare day: check-in → activities/meals/nap (in time
// order) → check-out → mood. Used by the parent today/history views and the
// principal history tab.
import { LogIn, LogOut, Utensils, Moon, Activity as ActivityIcon } from "lucide-react";
import type { FullLog } from "@/lib/daycare";
import { MOOD_META } from "@/lib/daycare-constants";

const time = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");

type Item = { sort: string; node: React.ReactNode };

export function LogTimeline({ log }: { log: FullLog }) {
  const items: Item[] = [];
  if (log.checkInTime) items.push({ sort: time(log.checkInTime), node: <Row icon={<LogIn className="h-4 w-4 text-emerald-600" />} label={`Checked in at ${time(log.checkInTime)}`} /> });
  for (const a of log.activities) items.push({ sort: a.time ?? "zz", node: <Row icon={<ActivityIcon className="h-4 w-4 text-violet-600" />} label={`${a.time ? a.time + " · " : ""}${a.activityName || a.activityType.replace(/_/g, " ")}`} sub={a.notes} /> });
  for (const m of log.meals) items.push({ sort: m.time ?? "zz", node: <Row icon={<Utensils className="h-4 w-4 text-amber-600" />} label={`${m.time ? m.time + " · " : ""}${m.mealType.replace(/_/g, " ")} — ${m.eaten ? "ate" : "didn't eat"}`} sub={m.notes} /> });
  for (const n of log.naps) items.push({ sort: n.startTime ?? "zz", node: <Row icon={<Moon className="h-4 w-4 text-blue-600" />} label={`Nap ${n.startTime ?? "?"}–${n.endTime ?? "?"}`} sub={n.quality?.replace(/_/g, " ")} /> });
  items.sort((a, b) => a.sort.localeCompare(b.sort));
  if (log.checkOutTime) items.push({ sort: "zzz", node: <Row icon={<LogOut className="h-4 w-4 text-rose-600" />} label={`Checked out at ${time(log.checkOutTime)}`} /> });

  if (items.length === 0 && !log.mood && !log.generalNotes) return <p className="text-sm text-muted-foreground">No log recorded.</p>;

  return (
    <div className="space-y-3">
      {log.mood && <div className="flex items-center gap-2 text-sm"><span className="text-xl">{MOOD_META[log.mood]?.emoji}</span> <span className="font-medium">{MOOD_META[log.mood]?.label}</span></div>}
      <ul className="space-y-2">{items.map((it, i) => <li key={i}>{it.node}</li>)}</ul>
      {log.generalNotes && <div className="rounded-md border bg-muted/20 p-2 text-sm"><span className="font-medium">Notes: </span>{log.generalNotes}</div>}
    </div>
  );
}

function Row({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string | null }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span><span>{label}</span>{sub && <span className="block text-xs text-muted-foreground">{sub}</span>}</span>
    </div>
  );
}
