// Parent teacher directory (/parent/staff).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getParentStaff } from "@/lib/staff";
import { ParentStaff } from "@/components/staff/parent-staff";

export default async function ParentStaffPage() {
  const session = await getServerSession(authOptions);
  const { staff, showContact } = await getParentStaff(session!.user.schoolId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Teachers</h1>
        <p className="text-muted-foreground">Meet your child&apos;s teachers.</p>
      </div>
      <ParentStaff staff={staff} showContact={showContact} />
    </div>
  );
}
