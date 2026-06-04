// Read-only child profile for parents (/parent/children/[id]). The [id] dynamic
// segment identifies which child. getChildForParent() filters by BOTH the child
// id AND the parent's own id, so a parent guessing another child's id simply
// gets null → 404. Ownership is enforced at the data layer, not just the UI.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getChildForParent } from "@/lib/students";
import { formatDate, getInitials } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function ChildDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const child = await getChildForParent(params.id, session!.user.id, session!.user.schoolId);

  if (!child) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/parent/children"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to my children
      </Link>

      <div className="flex items-center gap-4">
        {child.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={child.photo} alt={child.name} className="h-20 w-20 rounded-full object-cover" />
        ) : (
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-semibold text-primary-foreground">
            {getInitials(child.name)}
          </div>
        )}
        <div>
          <h1 className="text-2xl font-bold">{child.name}</h1>
          <p className="text-muted-foreground">
            #{child.admissionNumber} · Class {child.class?.name ?? "—"}
            {child.section ? ` · Section ${child.section.name}` : ""}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <InfoRow label="Full name" value={child.name} />
          <InfoRow label="Admission number" value={child.admissionNumber} />
          <InfoRow label="Date of birth" value={formatDate(child.dateOfBirth)} />
          <InfoRow label="Gender" value={child.gender ?? "—"} />
          <InfoRow label="Blood group" value={child.bloodGroup ?? "—"} />
          <InfoRow label="Class" value={child.class?.name ?? "—"} />
          <InfoRow label="Section" value={child.section?.name ?? "—"} />
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
