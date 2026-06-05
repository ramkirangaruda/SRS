import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listClassesWithSections } from "@/lib/students";
import { listSubjects } from "@/lib/homework";
import { CompareView } from "@/components/test-reports/compare-view";

export default async function ComparePage() {
  const session = await getServerSession(authOptions);
  const [classes, subjects] = await Promise.all([listClassesWithSections(session!.user.schoolId), listSubjects(session!.user.schoolId)]);
  return <CompareView classes={classes} subjects={subjects} />;
}
