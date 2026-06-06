// Application detail (/principal/admissions/[id]).
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAdmission } from "@/lib/admissions";
import { listClassesWithSections } from "@/lib/students";
import { AdmissionDetail } from "@/components/admissions/admission-detail";

export default async function AdmissionDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const admission = await getAdmission(params.id, schoolId);
  if (!admission) notFound();
  const classes = await listClassesWithSections(schoolId);

  return (
    <div className="space-y-6">
      <Link href="/principal/admissions" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to admissions</Link>
      <AdmissionDetail admission={admission} classes={classes} />
    </div>
  );
}
