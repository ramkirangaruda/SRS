// Add Homework (/principal/homework/new) — a full-page form (full-screen on mobile).
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { listSubjects } from "@/lib/homework";
import { listClassesWithSections } from "@/lib/students";
import { HomeworkForm } from "@/components/homework/homework-form";

export default async function NewHomeworkPage() {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const [classes, subjects] = await Promise.all([listClassesWithSections(schoolId), listSubjects(schoolId)]);

  return (
    <div className="space-y-4">
      <Link href="/principal/homework" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to homework
      </Link>
      <h1 className="text-2xl font-bold">Add Homework</h1>
      <HomeworkForm mode="create" classes={classes} subjects={subjects} />
    </div>
  );
}
