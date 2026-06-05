// Grade bands + ranking helpers (client-safe — no DB). Grade boundaries are a
// constant here; a later phase can make them per-school configurable.
export const GRADE_BANDS = [
  { grade: "A+", min: 90 },
  { grade: "A", min: 80 },
  { grade: "B+", min: 70 },
  { grade: "B", min: 60 },
  { grade: "C", min: 50 },
  { grade: "D", min: 40 },
  { grade: "F", min: 0 },
] as const;

export const GRADE_ORDER = ["A+", "A", "B+", "B", "C", "D", "F"];
export const PASS_PERCENT = 40;

export function gradeFor(percentage: number): string {
  for (const b of GRADE_BANDS) if (percentage >= b.min) return b.grade;
  return "F";
}

export function gradeColorClass(grade: string): string {
  if (grade === "A+" || grade === "A") return "bg-green-100 text-green-800";
  if (grade === "B+" || grade === "B") return "bg-blue-100 text-blue-800";
  if (grade === "C") return "bg-amber-100 text-amber-800";
  if (grade === "D") return "bg-orange-100 text-orange-800";
  return "bg-red-100 text-red-800";
}

// COMPETITION (standard) RANK with ties: equal scores share a rank and the next
// rank is SKIPPED → 1, 2, 2, 4 (not dense rank's 1, 2, 2, 3). We rank by a value
// (percentage) descending. Pass items already sorted high→low.
export function competitionRanks<T>(items: T[], valueOf: (x: T) => number): (T & { rank: number })[] {
  const out: (T & { rank: number })[] = [];
  let prevValue: number | null = null;
  let prevRank = 0;
  items.forEach((item, i) => {
    const v = valueOf(item);
    // Tie → same rank as previous; otherwise rank = position (1-based).
    const rank = prevValue !== null && v === prevValue ? prevRank : i + 1;
    out.push({ ...item, rank });
    prevValue = v;
    prevRank = rank;
  });
  return out;
}
