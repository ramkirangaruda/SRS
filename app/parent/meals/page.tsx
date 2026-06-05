// Parent meals (/parent/meals): School menu always; Daycare tab only if a child
// is enrolled in daycare. Today's Menu card on top.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MealsView } from "@/components/meals/meals-view";

export default async function ParentMealsPage() {
  const session = await getServerSession(authOptions);
  // Show the Daycare tab only if at least one of the parent's children is enrolled.
  const daycareChild = await prisma.student.findFirst({
    where: { parentId: session!.user.id, schoolId: session!.user.schoolId, isDaycare: true },
    select: { id: true },
  });
  return <MealsView editable={false} endpoint="/api/parent/meals" hasDaycare={!!daycareChild} />;
}
