// Broadcast detail (/principal/broadcast/[id]). Full message, audience, and the
// read/unread recipient list with the read count.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft, CheckCircle2, Circle } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getBroadcastById } from "@/lib/broadcast";
import { formatDate } from "@/lib/format";
import { timeLabel } from "@/lib/date-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AttachmentList } from "@/components/homework/attachment-list";
import { BroadcastDelete } from "@/components/broadcast/broadcast-delete";

export default async function BroadcastDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const msg = await getBroadcastById(params.id, session!.user.schoolId);
  if (!msg) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <Link href="/principal/broadcast" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to broadcasts
        </Link>
        <BroadcastDelete id={msg.id} />
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          {msg.urgent && <Badge variant="destructive">Urgent</Badge>}
          <h1 className="text-2xl font-bold">{msg.title}</h1>
        </div>
        <p className="text-muted-foreground">{msg.targetLabel ?? msg.targetRole} · {msg.sentByName ?? "—"}</p>
        <p className="text-xs text-muted-foreground">{formatDate(msg.createdAt)} {timeLabel(msg.createdAt)}</p>
      </div>

      <Card><CardContent className="p-4"><p className="whitespace-pre-wrap text-sm">{msg.message}</p></CardContent></Card>

      {msg.attachments.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-lg">Attachments</CardTitle></CardHeader>
          <CardContent><AttachmentList attachments={msg.attachments} /></CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recipients — {msg.readCount}/{msg.totalCount} read</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="divide-y">
            {msg.recipients.map((r) => (
              <li key={r.userId} className="flex items-center justify-between py-2 text-sm">
                <span>{r.name} <span className="text-xs text-muted-foreground">({r.role.toLowerCase()})</span></span>
                {r.read ? (
                  <span className="flex items-center gap-1 text-xs text-green-700"><CheckCircle2 className="h-4 w-4" /> Read</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground"><Circle className="h-4 w-4" /> Unread</span>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
