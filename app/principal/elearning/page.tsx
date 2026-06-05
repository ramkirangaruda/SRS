import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listClassesWithSections } from "@/lib/students";
import { ELearningTabs } from "@/components/elearning/elearning-tabs";

export default async function PrincipalElearningPage() {
  const session = await getServerSession(authOptions);
  const classes = await listClassesWithSections(session!.user.schoolId);
  return <ELearningTabs classes={classes} />;
}
