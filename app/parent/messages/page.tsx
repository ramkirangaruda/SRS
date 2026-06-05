// Parent inbox (/parent/messages). The inbox loads client-side via the
// cursor-paginated API and marks messages read on open.
import { MessagesInbox } from "@/components/broadcast/messages-inbox";

export default function ParentMessagesPage() {
  return <MessagesInbox />;
}
