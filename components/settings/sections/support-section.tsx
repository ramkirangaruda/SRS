// Support: FAQ accordion + contact form + bug report (auto device info) + About.
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const FAQS: { q: string; a: string }[] = [
  { q: "How do I reset my password?", a: "Go to Settings → Change Password, enter your current password and a new one. You'll be signed out on other devices." },
  { q: "How do I view my child's attendance?", a: "Open the Attendance section from the menu. Pick a month to see the day-by-day record and totals." },
  { q: "How do I check fees?", a: "Open Fees from the menu to see paid, partial and pending amounts, and download receipts." },
  { q: "How do I download report cards?", a: "Go to Report Cards, open a published report, and use Print / Save as PDF." },
  { q: "How do I see homework?", a: "Open Homework to see current and past assignments for your child's class." },
  { q: "How do I read the diary?", a: "The Diary section shows daily notes from the school; unread items are highlighted." },
  { q: "How do I join a virtual class?", a: "Open Virtual Classroom; live classes show a Join button. Recordings appear after the class." },
  { q: "How do I change the app language?", a: "Settings → Language, then pick your language. The app updates immediately." },
  { q: "Why was I logged out?", a: "Either your session expired, or your password was changed — log in again with your current password." },
  { q: "How do I contact the school?", a: "Use the Feedback section for class matters, or Support below for app/technical issues." },
];

const SUPPORT_WHATSAPP = "https://wa.me/915550100"; // school support number

export function SupportSection({ schoolName }: { schoolName: string }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="max-w-2xl space-y-6">
      <section>
        <h3 className="mb-2 font-semibold">Help &amp; FAQ</h3>
        {/* Accessible accordion: each header is a <button> with aria-expanded +
            aria-controls; the panel has a matching id and role=region. Buttons are
            natively keyboard-focusable and Enter/Space toggles them. */}
        <div className="divide-y rounded-md border">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div key={i}>
                <button id={`faq-h-${i}`} aria-expanded={isOpen} aria-controls={`faq-p-${i}`} onClick={() => setOpen(isOpen ? null : i)} className="flex w-full items-center justify-between gap-2 p-3 text-left text-sm font-medium hover:bg-muted">
                  {f.q}
                  <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && <div id={`faq-p-${i}`} role="region" aria-labelledby={`faq-h-${i}`} className="px-3 pb-3 text-sm text-muted-foreground">{f.a}</div>}
              </div>
            );
          })}
        </div>
      </section>

      <ContactForm />
      <BugReportForm />

      <section className="rounded-md border p-3 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">About</p>
        <p>SchoolSync v1.0.0 · Build {new Date().toISOString().slice(0, 10)}</p>
        <p>Made for {schoolName}</p>
        <a href={SUPPORT_WHATSAPP} target="_blank" className="text-blue-600 hover:underline">Chat with support on WhatsApp</a>
      </section>
    </div>
  );
}

function ContactForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    if (!subject.trim() || !message.trim()) return toast.error("Subject and message required");
    setBusy(true);
    const res = await fetch("/api/support/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject, message }) });
    setBusy(false);
    if (!res.ok) return toast.error("Failed to send");
    toast.success("Message sent to support"); setSubject(""); setMessage("");
  }
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">Technical Support</h3>
      <div className="space-y-1"><Label className="text-xs">Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
      <div className="space-y-1"><Label className="text-xs">Message</Label><Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={3} /></div>
      <Button onClick={send} disabled={busy}>{busy ? "Sending…" : "Send"}</Button>
    </section>
  );
}

function BugReportForm() {
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  async function send() {
    if (!description.trim()) return toast.error("Describe the issue");
    setBusy(true);
    // Collect device info from the browser for easier debugging.
    const deviceInfo = { userAgent: navigator.userAgent, platform: navigator.platform, language: navigator.language, screen: `${window.screen.width}×${window.screen.height}`, viewport: `${window.innerWidth}×${window.innerHeight}` };
    const res = await fetch("/api/support/bug-report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ description, deviceInfo }) });
    setBusy(false);
    if (!res.ok) return toast.error("Failed to send");
    toast.success("Bug report submitted — thank you!"); setDescription("");
  }
  return (
    <section className="space-y-2">
      <h3 className="font-semibold">Report a Bug</h3>
      <p className="text-xs text-muted-foreground">Your browser, OS and screen size are attached automatically to help us debug.</p>
      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What went wrong? What were you doing?" />
      <Button onClick={send} disabled={busy}>{busy ? "Submitting…" : "Submit bug report"}</Button>
    </section>
  );
}
