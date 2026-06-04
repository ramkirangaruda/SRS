// The four summary cards at the top of the fee dashboard. Presentational only
// (no hooks) — it receives already-computed totals (paise) and formats them.
// Responsive: 1 column on mobile, 2 on small, 4 on large.
import { Wallet, CheckCircle2, AlertCircle, PieChart } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/money";
import type { FeeSummary } from "@/lib/fees";

export function SummaryCards({ summary }: { summary: FeeSummary }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        label="Total Expected"
        value={formatINR(summary.expected)}
        icon={<Wallet className="h-5 w-5" />}
        tint="text-foreground"
        bg="bg-muted"
      />
      <StatCard
        label="Collected"
        value={formatINR(summary.collected)}
        icon={<CheckCircle2 className="h-5 w-5" />}
        tint="text-green-700"
        bg="bg-green-50"
      />
      <StatCard
        label="Pending"
        value={formatINR(summary.pending)}
        icon={<AlertCircle className="h-5 w-5" />}
        tint="text-red-700"
        bg="bg-red-50"
      />
      <StatCard
        label="Collection %"
        value={`${summary.percentage}%`}
        icon={<PieChart className="h-5 w-5" />}
        tint="text-blue-700"
        bg="bg-blue-50"
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  tint,
  bg,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tint: string;
  bg: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex h-10 w-10 items-center justify-center rounded-full ${bg} ${tint}`}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={`truncate text-lg font-bold ${tint}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
