// Money helpers. We store every amount as an INTEGER number of paise (the
// smallest unit of the rupee). This avoids floating-point rounding errors —
// integers add/subtract exactly. Conversion happens only at the edges:
//   - toMinor:   user types rupees (e.g. "1200.50") -> 120050 paise to store
//   - fromMinor: 120050 paise -> 1200.5 rupees for editing
//   - formatINR: 120050 paise -> "₹1,200.50" for display

// Rupees (number or numeric string) -> integer paise. Rounds to avoid float dust.
export function toMinor(rupees: number | string): number {
  const n = typeof rupees === "string" ? parseFloat(rupees) : rupees;
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

// Integer paise -> rupees as a number (for prefilling form inputs).
export function fromMinor(paise: number): number {
  return paise / 100;
}

// Integer paise -> a formatted INR string like "₹1,200.50".
export function formatINR(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(paise / 100);
}

// Percentage helper used across the fee dashboards. Guards divide-by-zero.
export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}
