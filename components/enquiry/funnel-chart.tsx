// Funnel chart, pure CSS. Each stage is a bar whose width = count / topCount, so
// the bars get progressively narrower down the funnel. Between bars we show the
// stage-to-stage conversion rate (this stage ÷ previous stage). Stacks vertically
// (already vertical) so it's mobile-friendly.
"use client";

const STAGES: { key: string; label: string; color: string }[] = [
  { key: "NEW", label: "New", color: "bg-blue-500" },
  { key: "CONTACTED", label: "Contacted", color: "bg-indigo-500" },
  { key: "VISIT_SCHEDULED", label: "Visit Scheduled", color: "bg-violet-500" },
  { key: "CONVERTED", label: "Converted", color: "bg-emerald-500" },
];

export function FunnelChart({ funnel }: { funnel: Record<string, number> }) {
  const top = Math.max(1, funnel[STAGES[0].key] ?? 0);
  return (
    <div className="space-y-1">
      {STAGES.map((s, i) => {
        const count = funnel[s.key] ?? 0;
        const widthPct = Math.max(6, Math.round((count / top) * 100));
        const prev = i > 0 ? funnel[STAGES[i - 1].key] ?? 0 : null;
        const rate = prev && prev > 0 ? Math.round((count / prev) * 100) : null;
        return (
          <div key={s.key}>
            {rate !== null && <p className="py-0.5 text-center text-[11px] text-muted-foreground">↓ {rate}%</p>}
            <div className="mx-auto flex h-12 items-center justify-center rounded text-sm font-semibold text-white transition-all" style={{ width: `${widthPct}%` }}>
              <div className={`flex h-full w-full items-center justify-center rounded ${s.color}`}>{s.label}: {count}</div>
            </div>
          </div>
        );
      })}
      <p className="pt-2 text-center text-xs text-muted-foreground">
        Overall conversion: <strong>{top ? Math.round(((funnel.CONVERTED ?? 0) / top) * 100) : 0}%</strong> ({funnel.CONVERTED ?? 0} of {top})
        {funnel.CLOSED ? ` · ${funnel.CLOSED} closed` : ""}
      </p>
    </div>
  );
}
