// Principal staff directory (/principal/staff).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listStaff, getStaffStats } from "@/lib/staff";
import { StaffDirectory } from "@/components/staff/staff-directory";

export default async function StaffPage() {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const [staff, stats] = await Promise.all([listStaff(schoolId), getStaffStats(schoolId)]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Staff</h1>
        <p className="text-muted-foreground">Manage staff, designations and HR details.</p>
      </div>
      <StaffDirectory initialStaff={staff} initialStats={stats} />
    </div>
  );
}
