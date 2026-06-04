// A loading placeholder. A muted, pulsing block shown WHILE data fetches, so the
// layout doesn't jump and the user sees the app is working. Compose several to
// mimic the shape of the content that's loading.
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} {...props} />;
}
