// The feedback STATE MACHINE, with no DB imports so client + server share it.
// Centralizing the transition rules here means every endpoint validates moves
// the same way — you can't accidentally allow an illegal one at some call site.

export const FEEDBACK_STATUSES = ["PENDING", "REPLIED", "CLOSED", "REOPENED"] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export const STATUS_LABEL: Record<FeedbackStatus, string> = {
  PENDING: "Pending",
  REPLIED: "Replied",
  CLOSED: "Closed",
  REOPENED: "Reopened",
};

// Badge color per status (yellow / green / grey / orange).
export const STATUS_BADGE: Record<FeedbackStatus, "warning" | "success" | "secondary" | "destructive"> = {
  PENDING: "warning",
  REPLIED: "success",
  CLOSED: "secondary",
  REOPENED: "destructive", // rendered orange-ish; visually distinct = "needs attention"
};

// Statuses that are "in the principal's queue" (awaiting a reply).
export function isOpenForPrincipal(status: string): boolean {
  return status === "PENDING" || status === "REOPENED";
}

// --- TRANSITIONS ---

// A principal may reply only if the ticket isn't CLOSED. Replying always lands
// in REPLIED. (This is the rule that stops "replying to a closed feedback".)
export function canPrincipalReply(status: string): boolean {
  return status !== "CLOSED";
}
export const PRINCIPAL_REPLY_RESULT: FeedbackStatus = "REPLIED";

// A principal may close anything that isn't already closed.
export function canClose(status: string): boolean {
  return status !== "CLOSED";
}

// A parent adding a message: from REPLIED or CLOSED it REOPENS the ticket;
// from PENDING/REOPENED it stays in that (still-open) state. Always allowed —
// a parent can always speak.
export function parentReplyResult(status: string): FeedbackStatus {
  if (status === "REPLIED" || status === "CLOSED") return "REOPENED";
  return (status as FeedbackStatus) ?? "PENDING";
}
