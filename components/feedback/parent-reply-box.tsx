// Parent's reply / reopen box on a feedback detail. If the ticket is REPLIED or
// CLOSED, posting REOPENS it (the server applies the transition); the button
// label reflects that.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function ParentReplyBox({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const reopening = status === "REPLIED" || status === "CLOSED";

  async function send() {
    if (!message.trim()) return;
    setBusy(true);
    const res = await fetch(`/api/parent/feedback/${id}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    setBusy(false);
    if (!res.ok) {
      toast.error("Failed to send");
      return;
    }
    setMessage("");
    toast.success(reopening ? "Reopened" : "Message sent");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder={reopening ? "Not satisfied? Add a message to reopen…" : "Add a message…"}
        rows={3}
      />
      <div className="flex justify-end">
        <Button onClick={send} disabled={busy || !message.trim()}>
          {busy ? "Sending…" : reopening ? "Reopen" : "Send"}
        </Button>
      </div>
    </div>
  );
}
