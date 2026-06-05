// Compose + send a broadcast (full-page; full-screen on mobile). Includes the
// multi-step audience selector:
//   Step 1 — Who? (All / Parents / Teachers / Specific Classes)
//   Step 2 — if Specific Classes: per-class "whole class" + section checkboxes
//   Preview — a live "this will go to N recipients" summary (from /preview),
//             then a confirm dialog before the message actually sends.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import type { ClassWithSections } from "@/lib/students";
import type { StoredFile } from "@/lib/upload-constants";
import type { TARGET_ROLES } from "@/lib/validations/broadcast";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Role = (typeof TARGET_ROLES)[number];
type ClassSel = { whole: boolean; sections: Set<string> };

// Turn the checkbox selection into the API's `classes` array.
function buildClasses(sel: Record<string, ClassSel>) {
  const out: { classId: string; sectionId?: string }[] = [];
  for (const [classId, s] of Object.entries(sel)) {
    if (s.whole) out.push({ classId }); // whole class = all sections
    else for (const sectionId of s.sections) out.push({ classId, sectionId });
  }
  return out;
}

export function BroadcastCompose({ classes }: { classes: ClassWithSections[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [attachments, setAttachments] = useState<StoredFile[]>([]);
  const [targetRole, setTargetRole] = useState<Role>("ALL");
  const [sel, setSel] = useState<Record<string, ClassSel>>({});
  const [preview, setPreview] = useState<{ count: number; label: string } | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const classesPayload = targetRole === "CLASSES" ? buildClasses(sel) : [];

  // Live audience preview (debounced) whenever the selection changes.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      const res = await fetch("/api/broadcast/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetRole, classes: classesPayload }),
      });
      if (!cancelled && res.ok) setPreview(await res.json());
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRole, JSON.stringify(classesPayload)]);

  function toggleWhole(classId: string) {
    setSel((prev) => {
      const cur = prev[classId] ?? { whole: false, sections: new Set<string>() };
      return { ...prev, [classId]: { whole: !cur.whole, sections: cur.whole ? cur.sections : new Set() } };
    });
  }
  function toggleSection(classId: string, sectionId: string) {
    setSel((prev) => {
      const cur = prev[classId] ?? { whole: false, sections: new Set<string>() };
      const sections = new Set(cur.sections);
      if (sections.has(sectionId)) sections.delete(sectionId);
      else sections.add(sectionId);
      return { ...prev, [classId]: { whole: false, sections } };
    });
  }

  function validate(): string | null {
    if (!title.trim()) return "Title is required";
    if (!message.trim()) return "Message is required";
    if (targetRole === "CLASSES" && classesPayload.length === 0) return "Select at least one class";
    return null;
  }

  async function send() {
    setSending(true);
    setError(null);
    const res = await fetch("/api/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, message, urgent, attachments, targetRole, classes: classesPayload }),
    });
    setSending(false);
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Failed to send");
      return;
    }
    const result = await res.json();
    toast.success(`Broadcast sent to ${result.count} recipients`);
    router.push("/principal/broadcast");
    router.refresh();
  }

  const RADIO: { value: Role; label: string }[] = [
    { value: "ALL", label: "All Users" },
    { value: "PARENTS", label: "All Parents" },
    { value: "TEACHERS", label: "All Teachers" },
    { value: "CLASSES", label: "Specific Classes" },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="b-title">Title *</Label>
        <Input id="b-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="b-msg">Message *</Label>
        <Textarea id="b-msg" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-red-700">
        <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)} className="h-4 w-4" />
        <AlertTriangle className="h-4 w-4" /> Mark as urgent
      </label>

      {/* Step 1 — Who? */}
      <div className="space-y-2 rounded-md border p-3">
        <Label className="text-sm font-semibold">Audience</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RADIO.map((r) => (
            <label key={r.value} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm ${targetRole === r.value ? "border-primary bg-accent" : ""}`}>
              <input type="radio" name="role" checked={targetRole === r.value} onChange={() => setTargetRole(r.value)} />
              {r.label}
            </label>
          ))}
        </div>

        {/* Step 2 — Specific Classes: whole-class + section sub-checkboxes */}
        {targetRole === "CLASSES" && (
          <div className="mt-2 space-y-2">
            {classes.map((c) => {
              const cs = sel[c.id] ?? { whole: false, sections: new Set<string>() };
              return (
                <div key={c.id} className="rounded-md border p-2">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input type="checkbox" checked={cs.whole} onChange={() => toggleWhole(c.id)} className="h-4 w-4" />
                    Class {c.name} (whole class)
                  </label>
                  {!cs.whole && c.sections.length > 0 && (
                    <div className="ml-6 mt-1 flex flex-wrap gap-3">
                      {c.sections.map((s) => (
                        <label key={s.id} className="flex items-center gap-1.5 text-sm">
                          <input type="checkbox" checked={cs.sections.has(s.id)} onChange={() => toggleSection(c.id, s.id)} className="h-4 w-4" />
                          Section {s.name}
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label>Attachments</Label>
        <FileUpload value={attachments} onChange={setAttachments} />
      </div>

      {/* Preview summary */}
      <div className="rounded-md bg-muted p-3 text-sm">
        {preview ? (
          <>This message will be sent to <span className="font-semibold">{preview.count}</span> {preview.label.toLowerCase()}.</>
        ) : (
          "Calculating audience…"
        )}
      </div>

      {error && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button
          type="button"
          disabled={sending || (preview?.count ?? 0) === 0}
          onClick={() => {
            const v = validate();
            if (v) return setError(v);
            setError(null);
            setConfirmOpen(true);
          }}
        >
          Send Broadcast
        </Button>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Send this broadcast?"
        description={preview ? `This message will be sent to ${preview.count} ${preview.label.toLowerCase()}.` : "Send this message?"}
        confirmLabel="Send"
        onConfirm={send}
      />
    </div>
  );
}
