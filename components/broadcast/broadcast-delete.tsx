// Soft-delete control for a broadcast detail page. Soft delete keeps the record
// (and read receipts) but removes it from lists/inboxes.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function BroadcastDelete({ id }: { id: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function remove() {
    const res = await fetch(`/api/broadcast/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Broadcast deleted");
    router.push("/principal/broadcast");
    router.refresh();
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2 text-destructive" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4" /> Delete
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Delete broadcast?"
        description="This removes it from inboxes but keeps the record and read receipts."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </>
  );
}
