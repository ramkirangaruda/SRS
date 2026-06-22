// Human-readable age (e.g. "2y 3m", "8m") from an ISO date-of-birth string.
// Client-safe: no imports, so both server and client components can use it.
export function ageFromDob(iso: string | null): string | null {
  if (!iso) return null;
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  if (now.getDate() < dob.getDate()) months--; // not yet reached this month's day
  if (months < 0) return null; // future DOB → treat as unknown
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${rem}m`;
  return rem === 0 ? `${years}y` : `${years}y ${rem}m`;
}
