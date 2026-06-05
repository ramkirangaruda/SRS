// Diary entry detail (/principal/diary/[id]).
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getDiaryById } from "@/lib/diary";
import { formatDate } from "@/lib/format";
import { timeLabel } from "@/lib/date-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AttachmentList } from "@/components/homework/attachment-list";

export default async function DiaryDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const entry = await getDiaryById(params.id, session!.user.schoolId);
  if (!entry) notFound();

  return (
    <div className="space-y-6">
      <Link href="/principal/diary" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to diary
      </Link>

      <div>
        <h1 className="text-2xl font-bold">{entry.title}</h1>
        <p className="text-muted-foreground">
          Class {entry.className ?? "—"}{entry.sectionName ? ` · Section ${entry.sectionName}` : ""} · {entry.postedByName ?? "—"}
        </p>
        <p className="text-xs text-muted-foreground">{formatDate(entry.date)} · {timeLabel(entry.createdAt)}</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="whitespace-pre-wrap text-sm">{entry.content}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Attachments</CardTitle></CardHeader>
        <CardContent><AttachmentList attachments={entry.attachments} /></CardContent>
      </Card>
    </div>
  );
}
