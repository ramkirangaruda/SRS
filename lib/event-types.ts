// Event type metadata (client-safe). One place defines the label + colors for
// each event type, used by the calendar dots, the legend, and the forms.
export const EVENT_TYPES = ["EXAM", "SPORTS", "CULTURAL", "HOLIDAY", "PTM", "OTHER"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_TYPE_META: Record<EventType, { label: string; dot: string; text: string }> = {
  EXAM: { label: "Exam", dot: "bg-red-500", text: "text-red-600" },
  SPORTS: { label: "Sports", dot: "bg-blue-500", text: "text-blue-600" },
  CULTURAL: { label: "Cultural", dot: "bg-purple-500", text: "text-purple-600" },
  HOLIDAY: { label: "Holiday", dot: "bg-green-500", text: "text-green-600" },
  PTM: { label: "PTM", dot: "bg-orange-500", text: "text-orange-600" },
  OTHER: { label: "Other", dot: "bg-gray-400", text: "text-gray-600" },
};

export function eventDot(type: string): string {
  return EVENT_TYPE_META[(type as EventType)] ? EVENT_TYPE_META[type as EventType].dot : EVENT_TYPE_META.OTHER.dot;
}
