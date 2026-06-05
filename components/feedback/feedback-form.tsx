// New-feedback form (parent). subject, category, message, attachments, and an
// ANONYMOUS toggle.
//
// How anonymous works: the toggle just sets isAnonymous=true on the ticket. We
// STILL store parentId (so the parent can track their own ticket and we can
// route replies). The hiding happens server-side: for anonymous tickets the
// principal APIs never return — and the detail query never even fetches — the
// parent's name/phone/email/class. So it's not "UI hides it"; the identity never
// leaves the database for the principal's eyes. (See the anonymity walkthrough
// for the DBA-level tradeoff.)
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { feedbackCreateSchema, type FeedbackCreateInput } from "@/lib/validations/feedback";
import { FEEDBACK_CATEGORIES } from "@/lib/feedback-categories";
import type { StoredFile } from "@/lib/upload-constants";
import { FileUpload } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function FeedbackForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FeedbackCreateInput>({
    resolver: zodResolver(feedbackCreateSchema),
    defaultValues: { subject: "", message: "", category: undefined, isAnonymous: false, attachments: [] },
  });

  const attachments = watch("attachments") ?? [];
  const isAnonymous = watch("isAnonymous");

  async function onSubmit(values: FeedbackCreateInput) {
    setSubmitError(null);
    const res = await fetch("/api/parent/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setSubmitError(json.error ?? "Something went wrong.");
      return;
    }
    const result = await res.json();
    // Confirmation: show the generated reference number, then open the ticket.
    toast.success(`Feedback submitted — ${result.referenceNumber}`);
    router.push(`/parent/feedback/${result.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="subject">Subject *</Label>
        <Input id="subject" {...register("subject")} />
        <FieldError message={errors.subject?.message} />
      </div>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <Controller
          control={control}
          name="category"
          render={({ field }) => (
            <Select value={field.value ?? ""} onValueChange={field.onChange}>
              <SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger>
              <SelectContent>
                {FEEDBACK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="message">Message *</Label>
        <Textarea id="message" rows={6} {...register("message")} />
        <FieldError message={errors.message?.message} />
      </div>

      <div className="space-y-1.5">
        <Label>Attachment (optional)</Label>
        <FileUpload value={attachments as StoredFile[]} onChange={(files) => setValue("attachments", files)} folder="homework-attachments" maxFiles={3} />
      </div>

      {/* Anonymous toggle */}
      <label className="flex items-start gap-3 rounded-md border p-3">
        <input type="checkbox" checked={!!isAnonymous} onChange={(e) => setValue("isAnonymous", e.target.checked)} className="mt-0.5 h-4 w-4" />
        <span className="text-sm">
          <span className="font-medium">Submit anonymously</span>
          <span className="block text-muted-foreground">The principal can read and reply, but won&apos;t see your name or details.</span>
        </span>
      </label>

      {submitError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Submitting…" : "Submit Feedback"}</Button>
      </div>
    </form>
  );
}
