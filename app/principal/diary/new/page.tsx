// New diary entry (/principal/diary/new).
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { listClassesWithSections } from "@/lib/students";
import { DiaryForm } from "@/components/diary/diary-form";

export default async function NewDiaryPage() {
  const session = await getServerSession(authOptions);
  const classes = await listClassesWithSections(session!.user.schoolId);
  return (
    <div className="space-y-4">
      <Link href="/principal/diary" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to diary
      </Link>
      <h1 className="text-2xl font-bold">New Diary Entry</h1>
      <DiaryForm mode="create" classes={classes} />
    </div>
  );
}
