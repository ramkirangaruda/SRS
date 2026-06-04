// Parent homework (/parent/homework). Server Component: reads ?status (Current/
// Past) + ?child, fetches the grouped homework for the parent's children, and
// renders the interactive view.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getParentHomework, type HomeworkStatus } from "@/lib/homework";
import { ParentHomeworkView } from "@/components/homework/parent-homework-view";

const STATUSES = ["ACTIVE", "ARCHIVED"];

export default async function ParentHomeworkPage({
  searchParams,
}: {
  searchParams: { status?: string; child?: string };
}) {
  const session = await getServerSession(authOptions);
  const statusRaw = searchParams.status ?? "ACTIVE";
  const status = (STATUSES.includes(statusRaw) ? statusRaw : "ACTIVE") as HomeworkStatus;

  const groups = await getParentHomework(session!.user.id, session!.user.schoolId, status);

  return <ParentHomeworkView groups={groups} status={status} childFilter={searchParams.child ?? ""} />;
}
