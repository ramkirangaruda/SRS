// Parent diary (/parent/diary). We fetch the child options server-side (for the
// switcher); the feed itself loads via the cursor-paginated parent API.
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ParentDiaryFeed } from "@/components/diary/parent-diary-feed";

export default async function ParentDiaryPage() {
  const session = await getServerSession(authOptions);
  const children = await prisma.student.findMany({
    where: { parentId: session!.user.id, schoolId: session!.user.schoolId },
    select: { id: true, name: true, class: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <ParentDiaryFeed
      children={children.map((c) => ({ id: c.id, name: c.name, className: c.class?.name ?? null }))}
    />
  );
}
