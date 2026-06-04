// Parent homework detail (/parent/homework/[id]). Read-only: description +
// downloadable attachments. getParentHomeworkDetail only returns the homework if
// it targets one of THIS parent's children's class/section (else 404).
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getParentHomeworkDetail } from "@/lib/homework";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DueBadge } from "@/components/homework/due-badge";
import { AttachmentList } from "@/components/homework/attachment-list";

export default async function ParentHomeworkDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const hw = await getParentHomeworkDetail(params.id, session!.user.id, session!.user.schoolId);
  if (!hw) notFound();

  return (
    <div className="space-y-6">
      <Link href="/parent/homework" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to homework
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{hw.title}</h1>
          {hw.status === "ACTIVE" && <DueBadge dueDate={hw.dueDate} />}
        </div>
        <p className="text-muted-foreground">
          {hw.subjectName ?? "General"} · Class {hw.className ?? "—"}
          {hw.sectionName ? ` · ${hw.sectionName}` : ""} · By {hw.assignedByName ?? "—"}
        </p>
        <p className="text-xs text-muted-foreground">Due {formatDate(hw.dueDate)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm">{hw.description || "—"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Attachments</CardTitle>
        </CardHeader>
        <CardContent>
          <AttachmentList attachments={hw.attachments} />
        </CardContent>
      </Card>
    </div>
  );
}
