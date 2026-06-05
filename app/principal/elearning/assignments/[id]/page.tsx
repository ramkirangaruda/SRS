// Assignment detail: details + submissions/grading.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getAssignment } from "@/lib/elearning";
import { formatDate } from "@/lib/format";
import { AttachmentList } from "@/components/homework/attachment-list";
import { AssignmentGrading } from "@/components/elearning/assignment-grading";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AssignmentDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const a = await getAssignment(params.id, session!.user.schoolId);
  if (!a) notFound();

  return (
    <div className="space-y-4">
      <Link href="/principal/elearning" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to e-learning</Link>
      <div>
        <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{a.title}</h1><Badge variant={a.status === "CLOSED" ? "secondary" : "success"}>{a.status}</Badge></div>
        <p className="text-sm text-muted-foreground">{a.className ?? "—"}{a.sectionName ? ` · ${a.sectionName}` : ""}{a.categoryName ? ` · ${a.categoryName}` : ""} · due {formatDate(a.dueDate)}{a.totalMarks ? ` · ${a.totalMarks} marks` : ""}</p>
      </div>
      {a.description && <p className="whitespace-pre-wrap text-sm">{a.description}</p>}
      {a.attachments.length > 0 && <Card><CardHeader><CardTitle className="text-lg">Reference Files</CardTitle></CardHeader><CardContent><AttachmentList attachments={a.attachments} /></CardContent></Card>}

      <Card>
        <CardHeader><CardTitle className="text-lg">Submissions</CardTitle></CardHeader>
        <CardContent><AssignmentGrading assignmentId={a.id} status={a.status} totalMarks={a.totalMarks} /></CardContent>
      </Card>
    </div>
  );
}
