// One homework card with a three-dot action menu. Active cards offer Edit /
// Archive / Delete; archived cards offer Restore / Delete-permanently. Archive is
// a soft delete (PATCH status) — reversible and preserves history; Delete is a
// hard delete (removes the row AND its files), guarded by a confirm dialog.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical, Paperclip, Pencil, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import type { HomeworkItem } from "@/lib/homework";
import { DueBadge } from "@/components/homework/due-badge";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function HomeworkCard({ hw, archived = false }: { hw: HomeworkItem; archived?: boolean }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function toggleArchive() {
    const res = await fetch(`/api/homework/${hw.id}/archive`, { method: "PATCH" });
    if (!res.ok) return toast.error("Action failed");
    toast.success(archived ? "Restored to Active" : "Moved to Archived");
    router.refresh();
  }

  async function remove() {
    const res = await fetch(`/api/homework/${hw.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Homework deleted");
    router.refresh();
  }

  return (
    <Card className={archived ? "opacity-70" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link href={`/principal/homework/${hw.id}`} className="font-semibold hover:underline">
              {hw.title}
            </Link>
            <p className="text-sm text-muted-foreground">
              {hw.subjectName ?? "General"} · Class {hw.className ?? "—"}
              {hw.sectionName ? ` · ${hw.sectionName}` : ""}
            </p>
          </div>

          {/* Three-dot menu */}
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground hover:bg-accent">
              <MoreVertical className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!archived && (
                <DropdownMenuItem asChild>
                  <Link href={`/principal/homework/${hw.id}/edit`} className="flex items-center gap-2">
                    <Pencil className="h-4 w-4" /> Edit
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => toggleArchive()}>
                {archived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4" /> Restore
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4" /> Archive
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setConfirmOpen(true)}>
                <Trash2 className="h-4 w-4" /> Delete{archived ? " permanently" : ""}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <DueBadge dueDate={hw.dueDate} />
          {hw.attachments.length > 0 && (
            <span className="flex items-center gap-1">
              <Paperclip className="h-3 w-3" /> {hw.attachments.length}
            </span>
          )}
          <span>By {hw.assignedByName ?? "—"}</span>
          <span>· Created {formatDate(hw.createdAt)}</span>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete homework?"
        description="This will permanently delete this homework and all attachments. Are you sure?"
        confirmLabel="Delete permanently"
        destructive
        onConfirm={remove}
      />
    </Card>
  );
}
