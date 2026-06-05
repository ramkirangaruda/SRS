// Status pill for feedback. Pending=yellow, Replied=green, Closed=grey,
// Reopened=orange. No hooks, so it works in Server + Client components.
import { Badge } from "@/components/ui/badge";
import { STATUS_LABEL, STATUS_BADGE, type FeedbackStatus } from "@/lib/feedback-state";

export function FeedbackStatusBadge({ status }: { status: string }) {
  const s = (STATUS_LABEL[status as FeedbackStatus] ? status : "PENDING") as FeedbackStatus;
  // Reopened uses an orange treatment; we override the badge color here.
  if (s === "REOPENED") {
    return <Badge className="border-transparent bg-orange-100 text-orange-800">Reopened</Badge>;
  }
  return <Badge variant={STATUS_BADGE[s]}>{STATUS_LABEL[s]}</Badge>;
}
