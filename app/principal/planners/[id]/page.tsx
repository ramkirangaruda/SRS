// Planner detail page (/principal/planners/[id]).
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { getPlanner } from "@/lib/planners";
import { listClassesWithSections } from "@/lib/students";
import { PlannerDetail } from "@/components/planners/planner-detail";

export default async function PlannerDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const planner = await getPlanner(params.id, schoolId);
  if (!planner) notFound();
  const classes = await listClassesWithSections(schoolId);
  const canManage = session!.user.role === ROLES.PRINCIPAL || planner.createdById === session!.user.id;

  return (
    <div className="space-y-6">
      <Link href="/principal/planners" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to planners</Link>
      <PlannerDetail planner={planner} classes={classes} canManage={canManage} />
    </div>
  );
}
