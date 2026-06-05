// Parent's "My Feedback" (/parent/feedback). Server-rendered list, newest first,
// with a status badge, message preview, reply preview, and an unread dot.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { Plus } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { listParentFeedback } from "@/lib/feedback";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FeedbackStatusBadge } from "@/components/feedback/feedback-status-badge";

export default async function ParentFeedbackPage() {
  const session = await getServerSession(authOptions);
  const items = await listParentFeedback(session!.user.id, session!.user.schoolId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">My Feedback</h1>
        <Button asChild className="gap-2">
          <Link href="/parent/feedback/new"><Plus className="h-4 w-4" /><span className="hidden sm:inline">New Feedback</span></Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">You haven&apos;t submitted any feedback yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <Link key={f.id} href={`/parent/feedback/${f.id}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{f.subject}</p>
                        {f.unread && <span className="h-2 w-2 rounded-full bg-blue-500" aria-label="unread reply" />}
                      </div>
                      <p className="text-xs text-muted-foreground">{f.referenceNumber}{f.category ? ` · ${f.category}` : ""}</p>
                    </div>
                    <FeedbackStatusBadge status={f.status} />
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{f.preview}</p>
                  {f.lastMessage && f.lastMessage.role === "PRINCIPAL" && (
                    <p className="mt-1 line-clamp-1 text-sm text-green-700">Reply: {f.lastMessage.text}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDate(f.createdAt)}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
