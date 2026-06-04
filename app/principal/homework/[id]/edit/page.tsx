// Edit Homework (/principal/homework/[id]/edit). Same form, pre-filled, with
// existing attachments shown (removable) and the option to add more.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getHomeworkById, listSubjects } from "@/lib/homework";
import { listClassesWithSections } from "@/lib/students";
import { HomeworkForm } from "@/components/homework/homework-form";

export default async function EditHomeworkPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;

  const [hw, classes, subjects] = await Promise.all([
    getHomeworkById(params.id, schoolId),
    listClassesWithSections(schoolId),
    listSubjects(schoolId),
  ]);
  if (!hw) notFound();

  return (
    <div className="space-y-4">
      <Link href={`/principal/homework/${hw.id}`} className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </Link>
      <h1 className="text-2xl font-bold">Edit Homework</h1>
      <HomeworkForm mode="edit" classes={classes} subjects={subjects} initial={hw} />
    </div>
  );
}
