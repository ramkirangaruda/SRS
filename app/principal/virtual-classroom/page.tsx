// Principal virtual classroom manager (/principal/virtual-classroom).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listClassesWithSections } from "@/lib/students";
import { listActiveTeachers } from "@/lib/timetable";
import { VCView } from "@/components/virtual-classroom/vc-view";

export default async function PrincipalVCPage() {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const [classes, teachers] = await Promise.all([listClassesWithSections(schoolId), listActiveTeachers(schoolId)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Virtual Classroom</h1>
        <p className="text-muted-foreground">Schedule online classes, share links and recordings.</p>
      </div>
      <VCView classes={classes} teachers={teachers} />
    </div>
  );
}
