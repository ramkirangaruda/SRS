// Client-safe date helpers for feed grouping ("Today" / "Yesterday" / full date)
// and a short time label. Comparisons use the viewer's LOCAL calendar day.

function localDayKey(d: Date): number {
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

// A header label for a diary/feed date.
export function dateHeader(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = (localDayKey(now) - localDayKey(d)) / 86400000;
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// A "key" used to group feed items by calendar day.
export function dayGroupKey(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

// "3:45 PM" style time, in the viewer's timezone.
export function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
