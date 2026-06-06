// Principal planners & resources (/principal/planners).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { listClassesWithSections } from "@/lib/students";
import { listSubjects } from "@/lib/homework";
import { PlannersResourcesView } from "@/components/planners/planners-resources-view";

export default async function PrincipalPlannersPage() {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const [classes, subjects] = await Promise.all([listClassesWithSections(schoolId), listSubjects(schoolId)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Planners & Resources</h1>
        <p className="text-muted-foreground">Lesson plans, activities and the teaching resource library.</p>
      </div>
      <PlannersResourcesView classes={classes} subjects={subjects} currentUserId={session!.user.id} isPrincipal={session!.user.role === ROLES.PRINCIPAL} />
    </div>
  );
}
