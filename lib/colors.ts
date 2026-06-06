// Deterministic color from a string.
//
// WHY: subjects in the timetable grid should each have a stable, distinct color
// WITHOUT us storing a color per subject in the DB. We derive the color purely
// from the subject name, so "Mathematics" is always the same shade everywhere —
// on the principal's builder, the teacher's view, and the parent's view — and a
// brand-new subject automatically gets a color with zero configuration.
//
// HOW: we hash the string to a number, then pick from a fixed palette of
// Tailwind classes by `hash % palette.length`. Same input → same index → same
// color, every time (that's what "deterministic" means).

// A curated palette of {bg, text, border} Tailwind classes. All are light/legible
// in both the grid cells and printed timetables. Order is arbitrary but fixed.
const SUBJECT_PALETTE = [
  { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
  { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
  { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300" },
  { bg: "bg-violet-100", text: "text-violet-800", border: "border-violet-300" },
  { bg: "bg-rose-100", text: "text-rose-800", border: "border-rose-300" },
  { bg: "bg-cyan-100", text: "text-cyan-800", border: "border-cyan-300" },
  { bg: "bg-lime-100", text: "text-lime-800", border: "border-lime-300" },
  { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
  { bg: "bg-fuchsia-100", text: "text-fuchsia-800", border: "border-fuchsia-300" },
  { bg: "bg-teal-100", text: "text-teal-800", border: "border-teal-300" },
] as const;

export type SubjectColor = { bg: string; text: string; border: string };

// djb2-style string hash: start at a prime, and for each char do
// hash = hash * 33 + charCode. The bit operations keep it a 32-bit integer.
// We don't need cryptographic quality — just a good, repeatable spread.
function hashString(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  // `>>> 0` forces an unsigned 32-bit int so the modulo below is never negative.
  return hash >>> 0;
}

// Pick a palette entry for a subject name (case-insensitive so "Maths" and
// "maths" match). Empty/free periods get a neutral gray.
export function subjectColor(name: string | null | undefined): SubjectColor {
  if (!name) return { bg: "bg-muted", text: "text-muted-foreground", border: "border-border" };
  const idx = hashString(name.trim().toLowerCase()) % SUBJECT_PALETTE.length;
  return SUBJECT_PALETTE[idx];
}
