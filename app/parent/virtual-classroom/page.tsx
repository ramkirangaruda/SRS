// Parent virtual classroom (/parent/virtual-classroom).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getParentClasses } from "@/lib/virtual-classroom";
import { ParentVirtualClassroom } from "@/components/virtual-classroom/parent-virtual-classroom";

export default async function ParentVCPage() {
  const session = await getServerSession(authOptions);
  const initial = await getParentClasses(session!.user.id, session!.user.schoolId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Virtual Classroom</h1>
        <p className="text-muted-foreground">Join your child&apos;s online classes and watch recordings.</p>
      </div>
      <ParentVirtualClassroom initial={initial} />
    </div>
  );
}
