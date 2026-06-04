// Edit + Delete controls for the student detail page. Client Component because
// it opens the edit modal and performs the DELETE request on click.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import type { ClassWithSections, StudentWithRelations } from "@/lib/students";
import { StudentForm } from "@/components/students/student-form";
import { Button } from "@/components/ui/button";

type Props = {
  student: StudentWithRelations;
  classes: ClassWithSections[];
};

export function StudentDetailActions({ student, classes }: Props) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    // A simple native confirm keeps this focused; a styled AlertDialog can come
    // later. Deleting is destructive, so we always confirm first.
    if (!window.confirm(`Delete ${student.name}? This cannot be undone.`)) return;
    setDeleting(true);
    setError(null);
    const res = await fetch(`/api/students/${student.id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json.error ?? "Failed to delete student.");
      setDeleting(false);
      return;
    }
    // Gone — go back to the list and refresh its data.
    router.push("/principal/students");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setEditOpen(true)}>
        <Pencil className="h-4 w-4" /> Edit
      </Button>
      <Button
        variant="destructive"
        size="sm"
        className="gap-2"
        onClick={handleDelete}
        disabled={deleting}
      >
        <Trash2 className="h-4 w-4" /> {deleting ? "Deleting…" : "Delete"}
      </Button>

      {error && <span className="text-sm text-destructive">{error}</span>}

      {/* Edit reuses the same form in "edit" mode, pre-filled with this student.
          Parents list isn't needed for editing (parent linkage isn't changed). */}
      <StudentForm
        mode="edit"
        open={editOpen}
        onOpenChange={setEditOpen}
        classes={classes}
        parents={[]}
        initialData={student}
      />
    </div>
  );
}
