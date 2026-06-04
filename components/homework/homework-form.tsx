// Create/Edit homework form (full-page; naturally full-screen on mobile). Uses
// react-hook-form + zod. Attachments are handled by <FileUpload>, which uploads
// files to /api/upload as they're picked and feeds back the resulting URLs — so
// THIS form only ever submits small JSON.
//
// (Description is a plain multi-line textarea rendered with preserved line breaks
// — a true WYSIWYG editor like TipTap/Lexical can drop in here later.)
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { homeworkCreateSchema, type HomeworkCreateInput } from "@/lib/validations/homework";
import type { ClassWithSections } from "@/lib/students";
import type { HomeworkItem } from "@/lib/homework";
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

type SubjectOption = { id: string; name: string; classId: string };

const today = () => new Date().toISOString().slice(0, 10);
const NONE = "__none__"; // sentinel for "no section/subject" Select options

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-destructive">{message}</p> : null;
}

export function HomeworkForm({
  mode,
  classes,
  subjects,
  initial,
}: {
  mode: "create" | "edit";
  classes: ClassWithSections[];
  subjects: SubjectOption[];
  initial?: HomeworkItem;
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
  } = useForm<HomeworkCreateInput>({
    resolver: zodResolver(homeworkCreateSchema),
    defaultValues: {
      title: initial?.title ?? "",
      description: initial?.description ?? "",
      classId: initial?.classId ?? "",
      sectionId: initial?.sectionId ?? "",
      subjectId: initial?.subjectId ?? "",
      dueDate: initial ? initial.dueDate.slice(0, 10) : "",
      attachments: initial?.attachments ?? [],
      notifyParents: true,
    },
  });

  const selectedClassId = watch("classId");
  const attachments = watch("attachments") ?? [];
  const sectionOptions = classes.find((c) => c.id === selectedClassId)?.sections ?? [];
  const subjectOptions = subjects.filter((s) => s.classId === selectedClassId);

  async function onSubmit(values: HomeworkCreateInput) {
    setSubmitError(null);
    const url = mode === "create" ? "/api/homework" : `/api/homework/${initial!.id}`;
    const method = mode === "create" ? "POST" : "PUT";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setSubmitError(json.error ?? "Something went wrong.");
      return;
    }
    toast.success(mode === "create" ? "Homework created" : "Homework updated");
    router.push("/principal/homework");
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
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" rows={6} {...register("description")} />
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
                  setValue("subjectId", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
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
              <Select
                value={field.value || NONE}
                onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                disabled={!selectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>All sections</SelectItem>
                  {sectionOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Subject</Label>
          <Controller
            control={control}
            name="subjectId"
            render={({ field }) => (
              <Select
                value={field.value || NONE}
                onValueChange={(v) => field.onChange(v === NONE ? "" : v)}
                disabled={!selectedClassId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {subjectOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="dueDate">Due date *</Label>
        <Input id="dueDate" type="date" min={today()} {...register("dueDate")} />
        <FieldError message={errors.dueDate?.message} />
      </div>

      <div className="space-y-1.5">
        <Label>Attachments</Label>
        <FileUpload
          value={attachments as StoredFile[]}
          onChange={(files) => setValue("attachments", files, { shouldValidate: true })}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" defaultChecked {...register("notifyParents")} className="h-4 w-4" />
        Send a push notification to parents
      </label>

      {submitError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {submitError}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : mode === "create" ? "Create Homework" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
