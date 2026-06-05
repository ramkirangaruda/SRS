// Principal feedback detail (/principal/feedback/[id]). Shows the submitter's
// identity — OR "Anonymous Parent" with no identifying info if anonymous (the
// data simply isn't in the response). Then the thread + reply/close box.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft, UserX } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getFeedback } from "@/lib/feedback";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackStatusBadge } from "@/components/feedback/feedback-status-badge";
import { FeedbackThread } from "@/components/feedback/feedback-thread";
import { PrincipalReplyClose } from "@/components/feedback/principal-reply-close";

export default async function PrincipalFeedbackDetailPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  const fb = await getFeedback(params.id, session!.user.schoolId);
  if (!fb) notFound();

  return (
    <div className="space-y-6">
      <Link href="/principal/feedback" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to feedback
      </Link>

      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold">{fb.subject}</h1>
          <FeedbackStatusBadge status={fb.status} />
        </div>
        <p className="text-sm text-muted-foreground">{fb.referenceNumber}{fb.category ? ` · ${fb.category}` : ""}</p>
      </div>

      {/* Submitter — anonymous shows NO identifying info (it's not in `fb`). */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Submitted by</CardTitle></CardHeader>
        <CardContent className="text-sm">
          {fb.submitter.anonymous ? (
            <p className="flex items-center gap-2 text-muted-foreground"><UserX className="h-4 w-4" /> Anonymous Parent</p>
          ) : (
            <div className="space-y-1">
              <p className="font-medium">{fb.submitter.name}</p>
              <p className="text-muted-foreground">{[fb.submitter.phone, fb.submitter.email].filter(Boolean).join(" · ") || "—"}</p>
              {fb.submitter.childName && (
                <p className="text-muted-foreground">Child: {fb.submitter.childName}{fb.submitter.childClass ? ` · Class ${fb.submitter.childClass}` : ""}</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Conversation</CardTitle></CardHeader>
        <CardContent><FeedbackThread messages={fb.messages} viewerRole="PRINCIPAL" /></CardContent>
      </Card>

      <PrincipalReplyClose id={fb.id} status={fb.status} />
    </div>
  );
}
