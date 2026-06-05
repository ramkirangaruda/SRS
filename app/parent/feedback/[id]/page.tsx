// Parent feedback detail (/parent/feedback/[id]). Full conversation thread +
// a reply/reopen box. Opening it marks the principal's reply as seen.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getParentFeedback } from "@/lib/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackStatusBadge } from "@/components/feedback/feedback-status-badge";
import { FeedbackThread } from "@/components/feedback/feedback-thread";
import { ParentReplyBox } from "@/components/feedback/parent-reply-box";

export default async function ParentFeedbackDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const fb = await getParentFeedback(params.id, session!.user.id, session!.user.schoolId);
  if (!fb) notFound();

  return (
    <div className="space-y-6">
      <Link href="/parent/feedback" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to feedback
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{fb.subject}</h1>
          <FeedbackStatusBadge status={fb.status} />
        </div>
        <p className="text-sm text-muted-foreground">{fb.referenceNumber}{fb.category ? ` · ${fb.category}` : ""}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Conversation</CardTitle></CardHeader>
        <CardContent>
          <FeedbackThread messages={fb.messages} viewerRole="PARENT" />
        </CardContent>
      </Card>

      <ParentReplyBox id={fb.id} status={fb.status} />
    </div>
  );
}
