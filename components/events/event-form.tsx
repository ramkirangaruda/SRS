// Add/Edit event dialog. Covers type, multi-day (endDate), audience (All vs
// specific classes), attachments, and recurrence (weekly/monthly/yearly + end).
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { eventCreateSchema, type EventCreateInput } from "@/lib/validations/event";
import { EVENT_TYPES, EVENT_TYPE_META } from "@/lib/event-types";
import type { ClassWithSections } from "@/lib/students";
import type { StoredFile } from "@/lib/upload-constants";
import { FileUpload } from "@/components/file-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Initial = Partial<EventCreateInput> & { id?: string };

export function EventForm({
  open, onOpenChange, classes, initial, onSaved, defaultDate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  classes: ClassWithSections[];
  initial?: Initial;
  onSaved: () => void;
  defaultDate?: string;
}) {
  const editing = !!initial?.id;
  const [err, setErr] = useState<string | null>(null);
  const { register, handleSubmit, control, watch, setValue, formState: { errors, isSubmitting } } = useForm<EventCreateInput>({
    resolver: zodResolver(eventCreateSchema),
    defaultValues: {
      title: initial?.title ?? "", description: initial?.description ?? "",
      date: initial?.date ?? defaultDate ?? new Date().toISOString().slice(0, 10),
      endDate: initial?.endDate ?? "", type: (initial?.type as EventCreateInput["type"]) ?? "OTHER",
      targetRole: (initial?.targetRole as "ALL" | "CLASSES") ?? "ALL", targetClassIds: initial?.targetClassIds ?? [],
      attachments: initial?.attachments ?? [], isRecurring: initial?.isRecurring ?? false,
      recurrenceFreq: initial?.recurrenceFreq, recurrenceEnd: initial?.recurrenceEnd ?? "",
    },
  });

  const targetRole = watch("targetRole");
  const isRecurring = watch("isRecurring");
  const targetClassIds = watch("targetClassIds") ?? [];
  const attachments = watch("attachments") ?? [];

  function toggleClass(id: string) {
    const set = new Set(targetClassIds);
    set.has(id) ? set.delete(id) : set.add(id);
    setValue("targetClassIds", Array.from(set));
  }

  async function onSubmit(values: EventCreateInput) {
    setErr(null);
    const url = editing ? `/api/events/${initial!.id}` : "/api/events";
    const res = await fetch(url, { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    if (!res.ok) { const j = await res.json().catch(() => ({})); setErr(j.error ?? "Failed"); return; }
    toast.success(editing ? "Event updated" : "Event created");
    onSaved();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{editing ? "Edit Event" : "Add Event"}</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5"><Label>Title *</Label><Input {...register("title")} />{errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}</div>
          <div className="space-y-1.5"><Label>Description</Label><Textarea rows={3} {...register("description")} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Date *</Label><Input type="date" {...register("date")} /></div>
            <div className="space-y-1.5"><Label>End date</Label><Input type="date" {...register("endDate")} /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Controller control={control} name="type" render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{EVENT_TYPE_META[t].label}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </div>

          {/* Audience */}
          <div className="space-y-2 rounded-md border p-3">
            <Label className="text-sm font-semibold">Audience</Label>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant={targetRole === "ALL" ? "default" : "outline"} onClick={() => setValue("targetRole", "ALL")}>All</Button>
              <Button type="button" size="sm" variant={targetRole === "CLASSES" ? "default" : "outline"} onClick={() => setValue("targetRole", "CLASSES")}>Specific Classes</Button>
            </div>
            {targetRole === "CLASSES" && (
              <div className="flex flex-wrap gap-2 pt-1">
                {classes.map((c) => (
                  <label key={c.id} className="flex items-center gap-1.5 text-sm">
                    <input type="checkbox" checked={targetClassIds.includes(c.id)} onChange={() => toggleClass(c.id)} className="h-4 w-4" /> {c.name}
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Recurrence */}
          <div className="space-y-2 rounded-md border p-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input type="checkbox" checked={!!isRecurring} onChange={(e) => setValue("isRecurring", e.target.checked)} className="h-4 w-4" /> Recurring event
            </label>
            {isRecurring && (
              <div className="grid grid-cols-2 gap-3">
                <Controller control={control} name="recurrenceFreq" render={({ field }) => (
                  <Select value={field.value ?? ""} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue placeholder="Frequency" /></SelectTrigger>
                    <SelectContent><SelectItem value="WEEKLY">Weekly</SelectItem><SelectItem value="MONTHLY">Monthly</SelectItem><SelectItem value="YEARLY">Yearly</SelectItem></SelectContent>
                  </Select>
                )} />
                <Input type="date" placeholder="Ends" {...register("recurrenceEnd")} />
              </div>
            )}
          </div>

          <div className="space-y-1.5"><Label>Attachments</Label><FileUpload value={attachments as StoredFile[]} onChange={(f) => setValue("attachments", f)} maxFiles={3} /></div>

          {err && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Saving…" : editing ? "Save" : "Create"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
