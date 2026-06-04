// The Add/Edit Student form, shown inside a modal Dialog. This is a Client
// Component: it uses react-hook-form for state + zod for validation, uploads the
// photo, and POSTs/PUTs to our API. The SAME zod schema runs here (instant
// feedback) and on the server (the real gate) — see lib/validations/student.ts.
"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  studentCreateSchema,
  studentUpdateSchema,
  type StudentCreateInput,
} from "@/lib/validations/student";
import type { ClassWithSections, StudentWithRelations } from "@/lib/students";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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

type ParentOption = { id: string; name: string; email: string };

type StudentFormProps = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: ClassWithSections[];
  parents: ParentOption[];
  initialData?: StudentWithRelations; // present in edit mode
};

// Convert a Date to the "YYYY-MM-DD" string an <input type="date"> expects.
function toDateInput(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

// A small error line shown under a field.
function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive">{message}</p>;
}

export function StudentForm({
  mode,
  open,
  onOpenChange,
  classes,
  parents,
  initialData,
}: StudentFormProps) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<StudentCreateInput>({
    // Pick the matching schema. In edit mode the parent fields aren't validated.
    resolver: zodResolver(mode === "create" ? studentCreateSchema : studentUpdateSchema) as never,
    defaultValues: {
      name: initialData?.name ?? "",
      admissionNumber: initialData?.admissionNumber ?? "",
      dateOfBirth: toDateInput(initialData?.dateOfBirth),
      gender: initialData?.gender ?? "",
      bloodGroup: initialData?.bloodGroup ?? "",
      address: initialData?.address ?? "",
      photo: initialData?.photo ?? "",
      classId: initialData?.classId ?? "",
      sectionId: initialData?.sectionId ?? "",
      parentMode: "existing",
      parentId: initialData?.parentId ?? "",
      newParent: { name: "", email: "", phone: "", password: "" },
    },
  });

  // Watch fields we need to react to: the chosen class drives section options,
  // and parentMode toggles which parent inputs show.
  const selectedClassId = watch("classId");
  const parentMode = watch("parentMode");
  const photo = watch("photo");
  const sectionOptions = classes.find((c) => c.id === selectedClassId)?.sections ?? [];

  // Upload the chosen photo to /api/upload and store the returned URL in the form.
  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setSubmitError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setValue("photo", json.url, { shouldValidate: true });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(values: StudentCreateInput) {
    setSubmitError(null);
    const url = mode === "create" ? "/api/students" : `/api/students/${initialData!.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    // In edit mode we only send the student's own fields (no parent linkage).
    const payload =
      mode === "create"
        ? values
        : {
            name: values.name,
            admissionNumber: values.admissionNumber,
            dateOfBirth: values.dateOfBirth,
            gender: values.gender,
            bloodGroup: values.bloodGroup,
            address: values.address,
            photo: values.photo,
            classId: values.classId,
            sectionId: values.sectionId,
          };

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setSubmitError(json.error ?? "Something went wrong. Please try again.");
      return;
    }

    // Success: close the dialog, reset, and refresh the server data so the new/
    // updated student appears in the table.
    onOpenChange(false);
    reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add Student" : "Edit Student"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Enter the student's details and link or create a parent account."
              : "Update the student's details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* --- Personal info --- */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" {...register("name")} />
              <FieldError message={errors.name?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="admissionNumber">Admission Number *</Label>
              <Input id="admissionNumber" {...register("admissionNumber")} />
              <FieldError message={errors.admissionNumber?.message} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <Input id="dateOfBirth" type="date" {...register("dateOfBirth")} />
              <FieldError message={errors.dateOfBirth?.message} />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Controller
                control={control}
                name="gender"
                render={({ field }) => (
                  <Select value={field.value || ""} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bloodGroup">Blood Group</Label>
              <Input id="bloodGroup" placeholder="e.g. O+" {...register("bloodGroup")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="photo">Photo</Label>
              <Input id="photo" type="file" accept="image/*" onChange={handlePhotoChange} />
              {uploading && <p className="text-xs text-muted-foreground">Uploading…</p>}
              {photo && !uploading && (
                <p className="text-xs text-muted-foreground">Uploaded ✓</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address">Address</Label>
            <Textarea id="address" {...register("address")} />
          </div>

          {/* --- Class & section --- */}
          <div className="grid gap-4 sm:grid-cols-2">
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
                      setValue("sectionId", ""); // reset section when class changes
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
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
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    disabled={!selectedClassId || sectionOptions.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
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
          </div>

          {/* --- Parent (create mode only) --- */}
          {mode === "create" && (
            <div className="space-y-3 rounded-md border p-3">
              <Label className="text-sm font-semibold">Parent</Label>
              {/* Toggle between linking an existing parent and creating a new one. */}
              <Controller
                control={control}
                name="parentMode"
                render={({ field }) => (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={field.value === "existing" ? "default" : "outline"}
                      onClick={() => field.onChange("existing")}
                    >
                      Existing parent
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={field.value === "new" ? "default" : "outline"}
                      onClick={() => field.onChange("new")}
                    >
                      New parent
                    </Button>
                  </div>
                )}
              />

              {parentMode === "existing" ? (
                <div className="space-y-1.5">
                  <Label>Select parent *</Label>
                  <Controller
                    control={control}
                    name="parentId"
                    render={({ field }) => (
                      <Select value={field.value || ""} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a parent" />
                        </SelectTrigger>
                        <SelectContent>
                          {parents.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldError message={errors.parentId?.message} />
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="np-name">Parent name *</Label>
                    <Input id="np-name" {...register("newParent.name")} />
                    <FieldError message={errors.newParent?.name?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="np-email">Parent email *</Label>
                    <Input id="np-email" type="email" {...register("newParent.email")} />
                    <FieldError message={errors.newParent?.email?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="np-phone">Parent phone *</Label>
                    <Input id="np-phone" {...register("newParent.phone")} />
                    <FieldError message={errors.newParent?.phone?.message} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="np-password">Temp password *</Label>
                    <Input id="np-password" type="text" {...register("newParent.password")} />
                    <FieldError message={errors.newParent?.password?.message} />
                  </div>
                </div>
              )}
            </div>
          )}

          {submitError && (
            <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {submitError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || uploading}>
              {isSubmitting ? "Saving…" : mode === "create" ? "Add Student" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
