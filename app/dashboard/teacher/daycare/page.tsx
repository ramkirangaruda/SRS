// Teacher daycare (/dashboard/teacher/daycare). Same manager as the principal.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listDaycareStudents } from "@/lib/daycare";
import { DaycareView } from "@/components/daycare/daycare-view";

export default async function TeacherDaycarePage() {
  const session = await getServerSession(authOptions);
  const students = await listDaycareStudents(session!.user.schoolId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daycare</h1>
        <p className="text-muted-foreground">Daily check-in/out and activity logs.</p>
      </div>
      <DaycareView studentsForHistory={students.map((s) => ({ id: s.id, name: s.name }))} />
    </div>
  );
}
