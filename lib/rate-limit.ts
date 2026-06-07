// Minimal in-memory rate limiter for brute-force protection on auth.
//
// HOW IT WORKS: we keep a per-key counter with an expiry. Each attempt increments
// it; once it exceeds `max` within the window, further attempts are blocked until
// the window resets. This raises the cost of guessing passwords from "thousands
// per second" to a handful per minute.
//
// SCOPE: in-memory = per server instance, which is fine for a single-instance
// deploy (Vercel may run several, so each enforces its own slice). For strict,
// cluster-wide limiting you'd back this with Redis (same logic, shared store).
type Entry = { count: number; resetAt: number };
const store = new Map<string, Entry>();

export function rateLimit(key: string, max = 5, windowMs = 60_000): { ok: boolean; retryAfterSec: number } {
  const now = Date.now();
  const e = store.get(key);
  if (!e || e.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  e.count++;
  if (e.count > max) return { ok: false, retryAfterSec: Math.ceil((e.resetAt - now) / 1000) };
  return { ok: true, retryAfterSec: 0 };
}

// Occasionally drop expired keys so the map can't grow unbounded.
export function sweepRateLimits() {
  const now = Date.now();
  for (const [k, v] of store) if (v.resetAt < now) store.delete(k);
}
