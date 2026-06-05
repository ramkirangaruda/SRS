// Create/Edit diary entry form (full-page; full-screen on mobile). Same pattern
// as the homework form: react-hook-form + zod, attachments via <FileUpload>
// (uploaded ahead of time), content as a plain multi-line textarea.
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { diaryCreateSchema, type DiaryCreateInput } from "@/lib/validations/diary";
import type { ClassWithSections } from "@/lib/students";
import type { DiaryItem } from "@/lib/diary";
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

const today = () => new Date().toISOString().slice(0, 10);
const NONE = "__none__";

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function DiaryForm({
  mode,
  classes,
  initial,
}: {
  mode: "create" | "edit";
  classes: ClassWithSections[];
  initial?: DiaryItem;
}) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DiaryCreateInput>({
    resolver: zodResolver(diaryCreateSchema),
    defaultValues: {
      title: initial?.title ?? "",
      content: initial?.content ?? "",
      classId: initial?.classId ?? "",
      sectionId: initial?.sectionId ?? "",
      date: initial ? initial.date.slice(0, 10) : today(),
      attachments: initial?.attachments ?? [],
    },
  });

  const classId = watch("classId");
  const attachments = watch("attachments") ?? [];
  const sectionOptions = classes.find((c) => c.id === classId)?.sections ?? [];

  async function onSubmit(values: DiaryCreateInput) {
    setSubmitError(null);
    const url = mode === "create" ? "/api/diary" : `/api/diary/${initial!.id}`;
    const res = await fetch(url, {
      method: mode === "create" ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setSubmitError(json.error ?? "Something went wrong.");
      return;
    }
    toast.success(mode === "create" ? "Diary entry posted" : "Diary entry updated");
    router.push("/principal/diary");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="title">Title *</Label>
        <Input id="title" {...register("title")} />
        <FieldError message={errors.title?.message} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="content">Content *</Label>
        <Textarea id="content" rows={6} {...register("content")} />
        <FieldError message={errors.content?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Class *</Label>
          <Controller
            control={control}
            name="classId"
            render={({ field }) => (
              <Select
                value={field.value || ""}
                onValueChange={(v) => {
                  field.onChange(v);
                  setValue("sectionId", "");
                }}
              >
                <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.classId?.message} />
        </div>

        <div className="space-y-1.5">
          <Label>Section</Label>
          <Controller
            control={control}
            name="sectionId"
            render={({ field }) => (
              <Select value={field.value || NONE} onValueChange={(v) => field.onChange(v === NONE ? "" : v)} disabled={!classId}>
                <SelectTrigger><SelectValue placeholder="Whole class" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Whole class</SelectItem>
                  {sectionOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input id="date" type="date" max={today()} {...register("date")} />
          <FieldError message={errors.date?.message} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Attachments</Label>
        <FileUpload value={attachments as StoredFile[]} onChange={(files) => setValue("attachments", files)} />
      </div>

      {submitError && <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{submitError}</p>}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : mode === "create" ? "Post Entry" : "Save Changes"}</Button>
      </div>
    </form>
  );
}
