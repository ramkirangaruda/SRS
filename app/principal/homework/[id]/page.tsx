// Homework detail (/principal/homework/[id]). Full details, rich-ish description
// (line breaks preserved), and downloadable attachment cards.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft, Pencil } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getHomeworkById } from "@/lib/homework";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DueBadge } from "@/components/homework/due-badge";
import { AttachmentList } from "@/components/homework/attachment-list";

export default async function HomeworkDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const hw = await getHomeworkById(params.id, session!.user.schoolId);
  if (!hw) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link href="/principal/homework" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to homework
        </Link>
        <Button asChild variant="outline" size="sm">
          <Link href={`/principal/homework/${hw.id}/edit`} className="gap-2">
            <Pencil className="h-4 w-4" /> Edit
          </Link>
        </Button>
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{hw.title}</h1>
          <DueBadge dueDate={hw.dueDate} />
        </div>
        <p className="text-muted-foreground">
          {hw.subjectName ?? "General"} · Class {hw.className ?? "—"}
          {hw.sectionName ? ` · Section ${hw.sectionName}` : ""} · By {hw.assignedByName ?? "—"}
        </p>
        <p className="text-xs text-muted-foreground">Created {formatDate(hw.createdAt)} · Due {formatDate(hw.dueDate)}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Description</CardTitle>
        </CardHeader>
        <CardContent>
          {/* whitespace-pre-wrap preserves the line breaks the teacher typed. */}
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
