// Parent daycare (/parent/daycare).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { parentToday } from "@/lib/daycare";
import { ParentDaycare } from "@/components/daycare/parent-daycare";

export default async function ParentDaycarePage() {
  const session = await getServerSession(authOptions);
  const initial = await parentToday(session!.user.id, session!.user.schoolId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Daycare</h1>
        <p className="text-muted-foreground">Your child&apos;s daycare day.</p>
      </div>
      <ParentDaycare initial={initial} />
    </div>
  );
}
