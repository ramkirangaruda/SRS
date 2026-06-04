// A vertical timeline of payments, with a running balance per entry. Plain
// (no hooks) so it renders in Server Components for both principal and parent.
// `showReceipt` adds a per-payment link to the printable receipt (principal only).
import Link from "next/link";
import { Receipt } from "lucide-react";
import type { PaymentTimelineItem } from "@/lib/fees";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/format";

export function PaymentTimeline({
  payments,
  showReceipt = false,
}: {
  payments: PaymentTimelineItem[];
  showReceipt?: boolean;
}) {
  if (payments.length === 0) {
    return <p className="text-sm text-muted-foreground">No payments recorded yet.</p>;
  }

  return (
    <ol className="relative space-y-6">
      {payments.map((p, i) => (
        <li key={p.id} className="relative pl-8">
          {/* The dot + connecting line drawn with absolute positioning. */}
          <span className="absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-700 ring-4 ring-background">
            <Receipt className="h-3.5 w-3.5" />
          </span>
          {i < payments.length - 1 && (
            <span className="absolute left-[11px] top-8 h-[calc(100%-0.5rem)] w-px bg-border" />
          )}

          {/* Stacks on mobile, spreads on desktop. */}
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold">{formatINR(p.amount)}</p>
              <p className="text-sm text-muted-foreground">
                {formatDate(p.date)} · {p.mode} · Receipt {p.receiptNumber}
              </p>
              <p className="text-xs text-muted-foreground">
                Collected by {p.collectedByName}
                {p.notes ? ` · ${p.notes}` : ""}
              </p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-muted-foreground">Balance after</p>
              <p className={p.runningBalance > 0 ? "font-medium text-red-700" : "font-medium text-green-700"}>
                {formatINR(p.runningBalance)}
              </p>
              {showReceipt && (
                <Link
                  href={`/principal/fees/receipt/${p.id}`}
                  target="_blank"
                  className="text-xs text-blue-600 hover:underline"
                >
                  Print receipt
                </Link>
              )}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
