// The conversation thread, rendered as a chat. The CURRENT viewer's own messages
// sit on the RIGHT in blue; the other party's on the LEFT in grey, each with a
// timestamp. Which side is "mine" depends on the viewer's role (a parent sees
// their own messages on the right; the principal sees theirs on the right).
// Plain component — usable in Server + Client.
import type { ThreadMessage } from "@/lib/feedback";
import { timeLabel } from "@/lib/date-group";
import { formatDate } from "@/lib/format";
import { AttachmentList } from "@/components/homework/attachment-list";

export function FeedbackThread({ messages, viewerRole }: { messages: ThreadMessage[]; viewerRole: "PARENT" | "PRINCIPAL" }) {
  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const mine = m.senderRole === viewerRole;
        return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 sm:max-w-[70%] ${mine ? "bg-blue-600 text-white" : "bg-muted text-foreground"}`}>
              <p className={`mb-0.5 text-xs font-medium ${mine ? "text-blue-100" : "text-muted-foreground"}`}>
                {m.senderName}
              </p>
              <p className="whitespace-pre-wrap text-sm">{m.message}</p>
              {m.attachments.length > 0 && (
                <div className="mt-2">
                  <AttachmentList attachments={m.attachments} />
                </div>
              )}
              <p className={`mt-1 text-[10px] ${mine ? "text-blue-100" : "text-muted-foreground"}`}>
                {formatDate(m.createdAt)} · {timeLabel(m.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
