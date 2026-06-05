// Edit diary entry (/principal/diary/[id]/edit). The API also re-checks that the
// caller is the author or a principal.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getDiaryById } from "@/lib/diary";
import { listClassesWithSections } from "@/lib/students";
import { DiaryForm } from "@/components/diary/diary-form";

export default async function EditDiaryPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const [entry, classes] = await Promise.all([getDiaryById(params.id, schoolId), listClassesWithSections(schoolId)]);
  if (!entry) notFound();
  return (
    <div className="space-y-4">
      <Link href={`/principal/diary/${entry.id}`} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold">Edit Diary Entry</h1>
      <DiaryForm mode="edit" classes={classes} initial={entry} />
    </div>
  );
}
