// Planner detail: full inline content or file link, with edit / duplicate /
// delete (gated to the creator or principal). Used both inside a dialog (from the
// list) and on the standalone /principal/planners/[id] page.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Copy, Trash2, FileText, Download } from "lucide-react";
import type { ClassWithSections } from "@/lib/students";
import { formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PlannerForm } from "@/components/planners/planner-form";

type Planner = {
  id: string; title: string; description: string | null; type: string; fileUrl: string | null; fileName: string | null;
  classId: string | null; subjectId: string | null; className: string | null; subjectName: string | null;
  createdByName: string | null; createdAt: string;
};

export function PlannerDetail({ planner, classes, canManage, onChanged, onDeleted }: { planner: Planner; classes: ClassWithSections[]; canManage: boolean; onChanged?: () => void; onDeleted?: () => void }) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function duplicate() {
    const res = await fetch(`/api/planners/${planner.id}/duplicate`, { method: "POST" });
    if (!res.ok) { toast.error("Duplicate failed"); return; }
    toast.success("Planner duplicated");
    onChanged?.();
    router.refresh();
  }
  async function del() {
    const res = await fetch(`/api/planners/${planner.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    toast.success("Planner deleted");
    onDeleted?.();
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-xl font-bold">{planner.title}</h2>
          <Badge variant="secondary">{planner.type.replace(/_/g, " ")}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {planner.className ? `Class ${planner.className}` : "—"}{planner.subjectName ? ` · ${planner.subjectName}` : ""} · by {planner.createdByName ?? "—"} · {formatDate(planner.createdAt)}
        </p>
      </div>

      {planner.description && <div className="whitespace-pre-wrap rounded-md border bg-muted/20 p-3 text-sm">{planner.description}</div>}
      {planner.fileUrl && (
        <a href={planner.fileUrl} target="_blank" className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
          <FileText className="h-4 w-4" /> {planner.fileName ?? "Attached file"} <Download className="h-3 w-3" />
        </a>
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={duplicate}><Copy className="mr-1 h-4 w-4" /> Duplicate</Button>
        {canManage && <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil className="mr-1 h-4 w-4" /> Edit</Button>}
        {canManage && <Button variant="outline" size="sm" className="text-destructive" onClick={() => setConfirmDelete(true)}><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>}
      </div>

      <PlannerForm open={editOpen} onOpenChange={setEditOpen} classes={classes} editing={planner} onSaved={() => { onChanged?.(); router.refresh(); }} />
      <ConfirmDialog open={confirmDelete} onOpenChange={setConfirmDelete} title="Delete this planner?" description="This cannot be undone." confirmLabel="Delete" onConfirm={del} />
    </div>
  );
}
