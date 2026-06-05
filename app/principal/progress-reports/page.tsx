import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listClassesWithSections } from "@/lib/students";
import { ProgressReportsTabs } from "@/components/progress-reports/progress-reports-tabs";

export default async function PrincipalProgressReportsPage() {
  const session = await getServerSession(authOptions);
  const [classes, years] = await Promise.all([
    listClassesWithSections(session!.user.schoolId),
    prisma.academicYear.findMany({ where: { schoolId: session!.user.schoolId }, select: { id: true, name: true }, orderBy: { name: "desc" } }),
  ]);
  return <ProgressReportsTabs classes={classes} years={years} />;
}
