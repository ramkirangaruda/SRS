// Principal events (/principal/events): full calendar with add/edit/delete.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listClassesWithSections } from "@/lib/students";
import { EventsView } from "@/components/events/events-view";

export default async function PrincipalEventsPage() {
  const session = await getServerSession(authOptions);
  const classes = await listClassesWithSections(session!.user.schoolId);
  return <EventsView editable endpoint="/api/events" upcomingEndpoint="/api/events/upcoming" classes={classes} />;
}
