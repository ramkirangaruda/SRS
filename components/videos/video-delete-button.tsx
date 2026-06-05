"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function VideoDeleteButton({ id, basePath }: { id: string; basePath: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  async function del() {
    const res = await fetch(`/api/videos/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    toast.success("Video deleted");
    router.push(basePath);
  }
  return (
    <>
      <Button variant="outline" size="sm" className="gap-1 text-destructive" onClick={() => setOpen(true)}><Trash2 className="h-4 w-4" /> Delete</Button>
      <ConfirmDialog open={open} onOpenChange={setOpen} title="Delete video?" description="This removes the video (and the file if it was uploaded)." confirmLabel="Delete" destructive onConfirm={del} />
    </>
  );
}
