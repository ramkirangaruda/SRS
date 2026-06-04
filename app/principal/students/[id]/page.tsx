// Student detail page (/principal/students/[id]). The [id] folder is a dynamic
// segment: visiting /principal/students/abc123 renders this file with
// params.id === "abc123". We fetch that student (scoped to the principal's
// school) on the server; if it doesn't exist we render the 404 page.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getStudentById, listClassesWithSections } from "@/lib/students";
import { getStudentAttendance } from "@/lib/attendance";
import { getHomeworkForClass } from "@/lib/homework";
import { formatDate, getInitials } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AttendanceSummary } from "@/components/attendance/attendance-summary";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";
import { DueBadge } from "@/components/homework/due-badge";
import type { AttendanceStatus } from "@/lib/attendance-status";
import { StudentDetailActions } from "@/components/students/student-detail-actions";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;

  // Current month, used for the Attendance tab.
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;

  const [student, classes, attendance] = await Promise.all([
    getStudentById(params.id, schoolId),
    listClassesWithSections(schoolId),
    getStudentAttendance(params.id, schoolId, year, month),
  ]);

  // Not found (or belongs to another school) → standard 404.
  if (!student) notFound();

  // Project the attendance days into the lookups the calendar/summary need.
  const statusByDate: Record<string, AttendanceStatus> = {};
  const noteByDate: Record<string, string | null> = {};
  for (const d of attendance?.days ?? []) {
    statusByDate[d.dateKey] = d.status;
    noteByDate[d.dateKey] = d.note;
  }

  // Recent active homework for this student's class/section.
  const homework = await getHomeworkForClass(student.classId, student.sectionId, schoolId, 5);

  return (
    <div className="space-y-6">
      {/* Back link + actions */}
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/principal/students"
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to students
        </Link>
        <StudentDetailActions student={student} classes={classes} />
      </div>

      {/* Header: photo/initials + name */}
      <div className="flex items-center gap-4">
        {student.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={student.photo} alt={student.name} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
            {getInitials(student.name)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <p className="text-muted-foreground">
            #{student.admissionNumber} · Class {student.class?.name ?? "—"}
            {student.section ? ` · Section ${student.section.name}` : ""}
          </p>
        </div>
      </div>

      {/* Tabs: Profile + Attendance. The Tabs component is a Client Component,
          but its panels are server-rendered content passed as children. */}
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="homework">Homework</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Full name" value={student.name} />
                <InfoRow label="Admission number" value={student.admissionNumber} />
                <InfoRow label="Date of birth" value={formatDate(student.dateOfBirth)} />
                <InfoRow label="Gender" value={student.gender ?? "—"} />
                <InfoRow label="Blood group" value={student.bloodGroup ?? "—"} />
                <InfoRow label="Address" value={student.address ?? "—"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Parent / Guardian</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Name" value={student.parent?.name ?? "—"} />
                <InfoRow label="Email" value={student.parent?.email ?? "—"} />
                <InfoRow label="Phone" value={student.parent?.phone ?? "—"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Class Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Class" value={student.class?.name ?? "—"} />
                <InfoRow label="Section" value={student.section?.name ?? "—"} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                This Month ({now.toLocaleString("en-US", { month: "long", year: "numeric" })})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {attendance && <AttendanceSummary counts={attendance.counts} percentage={attendance.percentage} />}
              <div className="max-w-md">
                <AttendanceCalendar
                  year={year}
                  month={month}
                  statusByDate={statusByDate}
                  noteByDate={noteByDate}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="homework">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Homework (this class)</CardTitle>
            </CardHeader>
            <CardContent>
              {homework.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active homework for this class.</p>
              ) : (
                <ul className="space-y-2">
                  {homework.map((hw) => (
                    <li key={hw.id} className="flex items-center justify-between gap-3 border-b pb-2 last:border-0">
                      <Link href={`/principal/homework/${hw.id}`} className="text-sm font-medium hover:underline">
                        {hw.title}
                        <span className="ml-2 text-xs text-muted-foreground">{hw.subjectName ?? "General"}</span>
                      </Link>
                      <DueBadge dueDate={hw.dueDate} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Small label/value row used throughout the detail cards.
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
