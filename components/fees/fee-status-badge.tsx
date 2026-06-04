// A status pill for PAID / PARTIAL / UNPAID. No hooks, so it works in both
// Server and Client Components.
import { Badge } from "@/components/ui/badge";
import { feeStatusVariant, type FeeStatus } from "@/lib/fee-status";

export function FeeStatusBadge({ status }: { status: FeeStatus }) {
  return <Badge variant={feeStatusVariant(status)}>{status}</Badge>;
}
