// Principal/Teacher diary (/principal/diary). Server passes the filter options +
// the current user (so the feed knows whose entries are editable).
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listClassesWithSections } from "@/lib/students";
import { listAssigners } from "@/lib/homework";
import { DiaryFeed } from "@/components/diary/diary-feed";

export default async function DiaryPage() {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const [classes, authors] = await Promise.all([listClassesWithSections(schoolId), listAssigners(schoolId)]);

  return (
    <DiaryFeed
      classes={classes}
      authors={authors}
      currentUserId={session!.user.id}
      currentRole={session!.user.role}
    />
  );
}
