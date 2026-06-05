// Parent events (/parent/events): same CalendarView, read-only, scoped to the
// parent's children's classes by the API.
import { EventsView } from "@/components/events/events-view";

export default function ParentEventsPage() {
  return <EventsView editable={false} endpoint="/api/parent/events" />;
}
