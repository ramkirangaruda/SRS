// Principal Fee Dashboard (/principal/fees). Server Component: computes the
// summary + the paginated per-student fee table on the server, then hands them
// to the <FeesView> Client Component for interactivity + optimistic updates.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getFeeSummary, listStudentFees, type FeeStatus } from "@/lib/fees";
import { listClassesWithSections } from "@/lib/students";
import { FeesView } from "@/components/fees/fees-view";

const STATUSES = ["PAID", "PARTIAL", "UNPAID"];

export default async function FeesPage({
  searchParams,
}: {
  searchParams: { search?: string; classId?: string; status?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;

  const search = searchParams.search ?? "";
  const classId = searchParams.classId ?? "";
  const statusRaw = searchParams.status ?? "";
  const status = STATUSES.includes(statusRaw) ? (statusRaw as FeeStatus) : undefined;
  const page = Number(searchParams.page ?? 1);

  const [summary, result, classes] = await Promise.all([
    getFeeSummary(schoolId),
    listStudentFees({ schoolId, search, classId, status, page, pageSize: 10 }),
    listClassesWithSections(schoolId),
  ]);

  return (
    <FeesView
      summary={summary}
      students={result.data}
      classes={classes.map((c) => ({ id: c.id, name: c.name }))}
      total={result.total}
      page={result.page}
      pageSize={result.pageSize}
      totalPages={result.totalPages}
      filters={{ search, classId, status: statusRaw }}
    />
  );
}
