// Principal/Teacher homework list (/principal/homework). Server Component:
// reads the URL filters, fetches the matching homework + filter options, and
// hands them to the interactive <HomeworkView>.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listHomework, listAssigners, listSubjects, type HomeworkStatus } from "@/lib/homework";
import { listClassesWithSections } from "@/lib/students";
import { HomeworkView } from "@/components/homework/homework-view";

const STATUSES = ["ACTIVE", "ARCHIVED"];

export default async function HomeworkPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    search?: string;
    classId?: string;
    sectionId?: string;
    subjectId?: string;
    assignedById?: string;
    page?: string;
  };
}) {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;

  const statusRaw = searchParams.status ?? "ACTIVE";
  const status = (STATUSES.includes(statusRaw) ? statusRaw : "ACTIVE") as HomeworkStatus;

  const [result, classes, subjects, assigners] = await Promise.all([
    listHomework({
      schoolId,
      status,
      search: searchParams.search ?? "",
      classId: searchParams.classId ?? "",
      sectionId: searchParams.sectionId ?? "",
      subjectId: searchParams.subjectId ?? "",
      assignedById: searchParams.assignedById ?? "",
      page: Number(searchParams.page ?? 1),
    }),
    listClassesWithSections(schoolId),
    listSubjects(schoolId),
    listAssigners(schoolId),
  ]);

  return (
    <HomeworkView
      homework={result.data}
      classes={classes}
      subjects={subjects}
      assigners={assigners}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      filters={{
        status,
        search: searchParams.search ?? "",
        classId: searchParams.classId ?? "",
        sectionId: searchParams.sectionId ?? "",
        subjectId: searchParams.subjectId ?? "",
        assignedById: searchParams.assignedById ?? "",
      }}
    />
  );
}
