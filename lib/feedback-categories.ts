// The fixed feedback categories (client-safe). Kept as a constant list rather
// than a table — simple, and it's exactly what the dropdown needs.
export const FEEDBACK_CATEGORIES = [
  "Academic",
  "Fees",
  "Transport",
  "Facilities",
  "Staff",
  "Other",
] as const;

export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];
