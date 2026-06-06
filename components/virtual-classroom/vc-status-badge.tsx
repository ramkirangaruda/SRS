// Status pill for a virtual class. LIVE gets a pulsing red dot to draw the eye.
import type { VCStatus } from "@/lib/virtual-classroom";
import { cn } from "@/lib/utils";

export function VCStatusBadge({ status }: { status: VCStatus }) {
  if (status === "LIVE") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-600" />
        </span>
        LIVE
      </span>
    );
  }
  return (
    <span className={cn(
      "rounded-full px-2 py-0.5 text-xs font-semibold",
      status === "UPCOMING" ? "bg-blue-100 text-blue-700" : "bg-muted text-muted-foreground"
    )}>
      {status === "UPCOMING" ? "Upcoming" : "Completed"}
    </span>
  );
}
