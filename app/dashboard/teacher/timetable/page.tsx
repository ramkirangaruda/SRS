// A teacher's own timetable (/dashboard/teacher/timetable). Locked to their id.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { activeYearId } from "@/lib/timetable";
import { TeacherTimetableView } from "@/components/timetable/teacher-timetable";

export default async function TeacherTimetablePage() {
  const session = await getServerSession(authOptions);
  const yearId = (await activeYearId(session!.user.schoolId)) ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Timetable</h1>
        <p className="text-muted-foreground">Your weekly teaching schedule and workload.</p>
      </div>
      <TeacherTimetableView fixedTeacherId={session!.user.id} academicYearId={yearId} />
    </div>
  );
}
