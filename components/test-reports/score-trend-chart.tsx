// Per-subject score trend line chart with recharts. We reshape the per-subject
// series into one row per test name (the x-axis), with a column per subject, then
// draw one <Line> per subject. Tooltip works on tap (mobile-friendly).
"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";

type Series = { subject: string; points: { testName: string; percentage: number }[] };
const LINE_COLORS = ["#3b82f6", "#16a34a", "#f97316", "#8b5cf6", "#ec4899", "#06b6d4"];

export function ScoreTrendChart({ series }: { series: Series[] }) {
  // Collect all test names (x-axis), preserving first-seen order.
  const tests: string[] = [];
  for (const s of series) for (const p of s.points) if (!tests.includes(p.testName)) tests.push(p.testName);
  // One row per test: { testName, [subject]: percentage }.
  const data = tests.map((t) => {
    const row: Record<string, string | number> = { testName: t };
    for (const s of series) { const pt = s.points.find((p) => p.testName === t); if (pt) row[s.subject] = pt.percentage; }
    return row;
  });

  if (series.length === 0 || data.length === 0) return <p className="text-sm text-muted-foreground">Not enough data for a trend yet.</p>;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="testName" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s, i) => <Line key={s.subject} type="monotone" dataKey={s.subject} stroke={LINE_COLORS[i % LINE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} connectNulls />)}
      </LineChart>
    </ResponsiveContainer>
  );
}
