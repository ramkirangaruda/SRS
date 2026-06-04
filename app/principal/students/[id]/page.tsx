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
import { formatDate, getInitials } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StudentDetailActions } from "@/components/students/student-detail-actions";

export default async function StudentDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;

  const [student, classes] = await Promise.all([
    getStudentById(params.id, schoolId),
    listClassesWithSections(schoolId),
  ]);

  // Not found (or belongs to another school) → standard 404.
  if (!student) notFound();

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

      {/* Info cards */}
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

      {/* Placeholder for future tabs (fees, attendance, reports) so you can see
          where Phase 4+ data will live. */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">More</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Fees, attendance, and report cards will appear here as tabs in a later phase.
        </CardContent>
      </Card>
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
