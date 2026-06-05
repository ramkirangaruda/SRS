// Grade distribution bar chart with recharts.
//
// HOW RECHARTS WORKS: you compose a chart from declarative React components.
// <ResponsiveContainer> sizes it to its parent; <BarChart data={...}> holds the
// data array; <XAxis dataKey> picks the category field; <Bar dataKey> draws bars
// from a numeric field; <Tooltip> shows values on hover/tap (touch-friendly out
// of the box). It's all SVG under the hood — no manual <svg> math.
"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

const COLORS: Record<string, string> = { "A+": "#16a34a", A: "#22c55e", "B+": "#3b82f6", B: "#60a5fa", C: "#f59e0b", D: "#f97316", F: "#ef4444" };

export function GradeDistributionChart({ data }: { data: { grade: string; count: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <XAxis dataKey="grade" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip cursor={{ fill: "rgba(0,0,0,0.04)" }} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {data.map((d) => <Cell key={d.grade} fill={COLORS[d.grade] ?? "#94a3b8"} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
