import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listClassesWithSections } from "@/lib/students";
import { listSubjects } from "@/lib/homework";
import { TestReportsView } from "@/components/test-reports/test-reports-view";

export default async function PrincipalTestReportsPage() {
  const session = await getServerSession(authOptions);
  const [classes, subjects] = await Promise.all([listClassesWithSections(session!.user.schoolId), listSubjects(session!.user.schoolId)]);
  return <TestReportsView classes={classes} subjects={subjects} />;
}
