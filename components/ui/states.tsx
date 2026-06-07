// Reusable empty + error states, and loading skeletons. Used app-wide so every
// page has consistent "no data", "it broke", and "loading" affordances instead of
// blank screens or raw spinners.
"use client";

import type { LucideIcon } from "lucide-react";
import { Inbox, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

// EMPTY STATE — friendly "nothing here yet" with an optional call-to-action.
export function EmptyState({ icon: Icon = Inbox, title, description, action }: { icon?: LucideIcon; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
      <Icon className="mb-3 h-10 w-10 text-muted-foreground/50" />
      <p className="font-medium">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ERROR STATE — shown when a fetch fails. Offers a retry instead of a dead page.
export function ErrorState({ message = "Something went wrong.", onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 p-10 text-center">
      <AlertTriangle className="mb-3 h-10 w-10 text-destructive/70" />
      <p className="font-medium">{message}</p>
      {onRetry && <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

// SKELETON — a grey placeholder block that pulses. Compose these into page-shaped
// skeletons (cards/table/detail) so the layout doesn't jump when data arrives.
function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
}

export function PageSkeleton({ variant = "cards" }: { variant?: "cards" | "table" | "form" | "detail" }) {
  if (variant === "table") {
    return (
      <div className="space-y-2">
        <Block className="h-9 w-48" />
        {Array.from({ length: 8 }).map((_, i) => <Block key={i} className="h-12 w-full" />)}
      </div>
    );
  }
  if (variant === "form") {
    return (
      <div className="max-w-md space-y-4">
        {Array.from({ length: 5 }).map((_, i) => <div key={i} className="space-y-1"><Block className="h-3 w-24" /><Block className="h-10 w-full" /></div>)}
        <Block className="h-10 w-32" />
      </div>
    );
  }
  if (variant === "detail") {
    return (
      <div className="space-y-4">
        <Block className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2">{Array.from({ length: 2 }).map((_, i) => <Block key={i} className="h-40 w-full" />)}</div>
      </div>
    );
  }
  // cards
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => <Block key={i} className="h-28 w-full" />)}
    </div>
  );
}
