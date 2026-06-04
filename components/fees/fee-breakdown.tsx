// A compact fee breakdown (total / paid / pending + status). Shared by the
// principal and parent fee detail pages. Plain presentational component.
import { Card, CardContent } from "@/components/ui/card";
import { formatINR } from "@/lib/money";
import type { FeeStatus } from "@/lib/fee-status";
import { FeeStatusBadge } from "@/components/fees/fee-status-badge";

export function FeeBreakdown({
  total,
  paid,
  pending,
  status,
  description,
}: {
  total: number;
  paid: number;
  pending: number;
  status: FeeStatus;
  description?: string | null;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{description ?? "Annual fee"}</p>
          <FeeStatusBadge status={status} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-semibold">{formatINR(total)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Paid</p>
            <p className="font-semibold text-green-700">{formatINR(paid)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className={pending > 0 ? "font-semibold text-red-700" : "font-semibold text-green-700"}>
              {formatINR(pending)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
