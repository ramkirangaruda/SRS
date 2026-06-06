// Teacher virtual classroom (/dashboard/teacher/virtual-classroom). Same manager
// as the principal — teachers can host their own online classes.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listClassesWithSections } from "@/lib/students";
import { listActiveTeachers } from "@/lib/timetable";
import { VCView } from "@/components/virtual-classroom/vc-view";

export default async function TeacherVCPage() {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const [classes, teachers] = await Promise.all([listClassesWithSections(schoolId), listActiveTeachers(schoolId)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Virtual Classroom</h1>
        <p className="text-muted-foreground">Schedule and host your online classes.</p>
      </div>
      <VCView classes={classes} teachers={teachers} />
    </div>
  );
}
