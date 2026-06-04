// Parent attendance detail (/parent/attendance/[studentId]). Full month calendar,
// a summary, a low-attendance warning, and a list of absent/late dates with the
// teacher's notes. getChildAttendanceDetail filters by parentId → ownership.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getChildAttendanceDetail } from "@/lib/attendance";
import {
  STATUS_LABEL,
  LOW_ATTENDANCE_THRESHOLD,
  type AttendanceStatus,
} from "@/lib/attendance-status";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttendanceSummary } from "@/components/attendance/attendance-summary";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";

export default async function ParentChildAttendancePage({
  params,
}: {
  params: { studentId: string };
}) {
  const session = await getServerSession(authOptions);
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const detail = await getChildAttendanceDetail(
    params.studentId,
    session!.user.id,
    session!.user.schoolId,
    year,
    month
  );
  if (!detail) notFound();

  // Build the calendar lookups + the absent/late list from the day records.
  const statusByDate: Record<string, AttendanceStatus> = {};
  const noteByDate: Record<string, string | null> = {};
  for (const d of detail.days) {
    statusByDate[d.dateKey] = d.status;
    noteByDate[d.dateKey] = d.note;
  }
  const flagged = detail.days.filter((d) => d.status === "ABSENT" || d.status === "LATE" || d.status === "HALF_DAY");
  const low = detail.counts.total > 0 && detail.percentage < LOW_ATTENDANCE_THRESHOLD;
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="space-y-6">
      <Link
        href="/parent/attendance"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to attendance
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{detail.student.name}</h1>
        <p className="text-muted-foreground">
          Class {detail.student.className ?? "—"}
          {detail.student.sectionName ? ` · ${detail.student.sectionName}` : ""} · {monthLabel}
        </p>
      </div>

      {/* Low-attendance warning banner. */}
      {low && (
        <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm">
            Attendance is low this month ({detail.percentage}%). Please ensure regular attendance.
          </p>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceSummary counts={detail.counts} percentage={detail.percentage} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-w-md">
            <AttendanceCalendar year={year} month={month} statusByDate={statusByDate} noteByDate={noteByDate} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Absences & Late Days</CardTitle>
        </CardHeader>
        <CardContent>
          {flagged.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing to report — great attendance!</p>
          ) : (
            <ul className="space-y-2">
              {flagged.map((d) => (
                <li key={d.dateKey} className="flex items-start justify-between gap-4 border-b pb-2 text-sm last:border-0">
                  <div>
                    <span className="font-medium">{formatDate(d.dateKey)}</span>
                    <span className="ml-2 text-muted-foreground">{STATUS_LABEL[d.status]}</span>
                  </div>
                  {d.note && <span className="text-right text-muted-foreground">{d.note}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
