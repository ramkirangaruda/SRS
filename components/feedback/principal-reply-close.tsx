// Principal's reply box + close control. The textarea doubles as the reply body
// and (optionally) the closing note. Replying transitions the ticket to REPLIED;
// the server REJECTS a reply to a CLOSED ticket (409) — surfaced as a toast.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Send, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function PrincipalReplyClose({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const isClosed = status === "CLOSED";

  async function reply() {
    if (!message.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/feedback/${id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Failed to reply");
      return;
    }
    setMessage("");
    toast.success("Reply sent");
    router.refresh();
  }

  async function close() {
    setBusy(true);
    // Whatever is in the box becomes the optional closing note.
    const res = await fetch(`/api/feedback/${id}/close`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closingNote: message }),
    });
    setBusy(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      toast.error(json.error ?? "Failed to close");
      return;
    }
    setMessage("");
    toast.success("Ticket closed");
    router.refresh();
  }

  if (isClosed) {
    return (
      <div className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
        This ticket is closed. If the parent replies, it will reopen and you can respond again.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a reply, or a closing note…" rows={3} />
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={close} disabled={busy} className="gap-2">
          <XCircle className="h-4 w-4" /> Close
        </Button>
        <Button onClick={reply} disabled={busy || !message.trim()} className="gap-2">
          <Send className="h-4 w-4" /> Send Reply
        </Button>
      </div>
    </div>
  );
}
