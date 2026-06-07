// Relative timestamp formatter: turns an ISO date into "just now", "2m ago",
// "3h ago", "2d ago", or a date for anything older. Pure + client-safe.
//
// HOW: take (now - then) in seconds and bucket it. Each unit (min/hour/day) is
// 60×/24× the previous, so we divide down until the number is human-sized.
export function timeAgo(iso: string | Date): string {
  const then = typeof iso === "string" ? new Date(iso) : iso;
  const secs = Math.floor((Date.now() - then.getTime()) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString();
}
