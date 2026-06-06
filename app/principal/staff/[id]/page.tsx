// Staff detail (/principal/staff/[id]).
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStaffDetail, getStaffClasses } from "@/lib/staff";
import { activeYearId } from "@/lib/timetable";
import { StaffDetailView } from "@/components/staff/staff-detail";

export default async function StaffDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const staff = await getStaffDetail(params.id, schoolId);
  if (!staff) notFound();

  const [classes, yearId] = await Promise.all([getStaffClasses(staff.userId, schoolId), activeYearId(schoolId)]);

  return (
    <div className="space-y-6">
      <Link href="/principal/staff" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to staff
      </Link>
      <StaffDetailView staff={staff} classes={classes} academicYearId={yearId ?? ""} />
    </div>
  );
}
