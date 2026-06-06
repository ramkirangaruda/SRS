// Parent timetable (/parent/timetable). Loads the first child's weekly grid;
// the client view handles child switching + today/now highlighting.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getParentTimetable } from "@/lib/timetable";
import { ParentTimetable } from "@/components/timetable/parent-timetable";

export default async function ParentTimetablePage() {
  const session = await getServerSession(authOptions);
  const initial = await getParentTimetable(session!.user.id, session!.user.schoolId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Timetable</h1>
        <p className="text-muted-foreground">Your child&apos;s weekly class schedule.</p>
      </div>
      <ParentTimetable initial={initial} />
    </div>
  );
}
