// Principal feedback management (/principal/feedback). Reads the URL filters,
// fetches counts + the filtered/paginated list, and renders the interactive view.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listFeedback, feedbackCounts } from "@/lib/feedback";
import { PrincipalFeedbackList } from "@/components/feedback/principal-feedback-list";

export default async function PrincipalFeedbackPage({
  searchParams,
}: {
  searchParams: { status?: string; category?: string; search?: string; startDate?: string; endDate?: string; page?: string };
}) {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;

  const [counts, result] = await Promise.all([
    feedbackCounts(schoolId),
    listFeedback({
      schoolId,
      status: searchParams.status ?? "",
      category: searchParams.category ?? "",
      search: searchParams.search ?? "",
      startDate: searchParams.startDate ?? "",
      endDate: searchParams.endDate ?? "",
      page: Number(searchParams.page ?? 1),
    }),
  ]);

  return (
    <PrincipalFeedbackList
      items={result.data}
      counts={counts}
      total={result.total}
      page={result.page}
      totalPages={result.totalPages}
      filters={{ status: searchParams.status ?? "", category: searchParams.category ?? "", search: searchParams.search ?? "" }}
    />
  );
}
