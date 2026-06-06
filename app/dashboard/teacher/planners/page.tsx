// Teacher planners & resources (/dashboard/teacher/planners). Same hub; the
// teacher can only edit/delete their own planners/resources (enforced server-side).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { listClassesWithSections } from "@/lib/students";
import { listSubjects } from "@/lib/homework";
import { PlannersResourcesView } from "@/components/planners/planners-resources-view";

export default async function TeacherPlannersPage() {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const [classes, subjects] = await Promise.all([listClassesWithSections(schoolId), listSubjects(schoolId)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planners & Resources</h1>
        <p className="text-muted-foreground">Your lesson plans and the shared resource library.</p>
      </div>
      <PlannersResourcesView classes={classes} subjects={subjects} currentUserId={session!.user.id} isPrincipal={session!.user.role === ROLES.PRINCIPAL} />
    </div>
  );
}
