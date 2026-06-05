// Report card page — renders the SAME ReportCard template used in-app and for
// printing. Used for both "View" (no auto-print) and "Download PDF" (?print=1 →
// the browser's Save-as-PDF). Role-aware: a parent can only open a PUBLISHED
// report for their own child; principal/teacher can open any in their school.
//
// WHY in-browser HTML beats an embedded PDF viewer on mobile: the HTML reflows to
// the screen, text stays selectable and zoomable, and there's no clunky PDF
// plugin — the same markup that displays also prints cleanly to A4.
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { getReport } from "@/lib/progress-reports";
import { ReportCard } from "@/components/progress-reports/report-card";
import { PrintTrigger } from "@/components/fees/print-trigger";

export default async function ReportCardPrintPage({ params, searchParams }: { params: { id: string }; searchParams: { print?: string } }) {
  const session = await getServerSession(authOptions);
  const isParent = session!.user.role === ROLES.PARENT;
  // Parents are restricted to PUBLISHED reports of their own children.
  const report = await getReport(params.id, session!.user.schoolId, isParent ? { status: "PUBLISHED", student: { parentId: session!.user.id } } : {});
  if (!report) notFound();

  const showRank = isParent ? report.school.showRankToParents : true;

  return (
    <div className="min-h-screen bg-gray-100 py-4 print:bg-white print:py-0">
      {searchParams.print && <PrintTrigger />}
      <ReportCard report={report} showRank={showRank} />
    </div>
  );
}
