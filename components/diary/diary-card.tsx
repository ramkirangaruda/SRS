// A diary entry card for the principal/teacher feed. Shows a 2-line preview and
// a three-dot menu — but Edit/Delete only appear if the viewer is the author or
// a principal (the API enforces this too; this just hides what they can't do).
"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { MoreVertical, Paperclip, Pencil, Trash2 } from "lucide-react";
import type { DiaryItem } from "@/lib/diary";
import { timeLabel } from "@/lib/date-group";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function DiaryCard({
  entry,
  currentUserId,
  currentRole,
  onDeleted,
}: {
  entry: DiaryItem;
  currentUserId: string;
  currentRole: string;
  onDeleted: (id: string) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const canModify = entry.postedById === currentUserId || currentRole === "PRINCIPAL";

  async function remove() {
    const res = await fetch(`/api/diary/${entry.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Entry deleted");
    onDeleted(entry.id);
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/principal/diary/${entry.id}`} className="min-w-0">
            <p className="font-semibold hover:underline">{entry.title}</p>
            {/* 2-line preview */}
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{entry.content}</p>
          </Link>

          {canModify && (
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-md p-1 text-muted-foreground hover:bg-accent">
                <MoreVertical className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/principal/diary/${entry.id}/edit`} className="flex items-center gap-2">
                    <Pencil className="h-4 w-4" /> Edit
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem destructive onSelect={() => setConfirmOpen(true)}>
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Class {entry.className ?? "—"}{entry.sectionName ? ` · ${entry.sectionName}` : ""}</span>
          <span>· {entry.postedByName ?? "—"}</span>
          <span>· {timeLabel(entry.createdAt)}</span>
          {entry.attachments.length > 0 && (
            <span className="flex items-center gap-1"><Paperclip className="h-3 w-3" /> {entry.attachments.length}</span>
          )}
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete diary entry?"
        description="This will permanently delete this entry and its attachments."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </Card>
  );
}
