// Small formatting helpers shared across the UI so dates and avatars look
// consistent everywhere (table, cards, detail pages).

// Format a Date (or null) as a readable date like "15 Mar 2019".
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

// Produce up-to-two-letter initials from a name, e.g. "Mia Parent" -> "MP".
// Used for the avatar fallback when a student has no photo.
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
