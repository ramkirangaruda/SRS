// The branch switcher shown to the principal in the sidebar + mobile drawer.
// Changing it POSTs the new branch to the server (which stores the cookie), then
// calls router.refresh() so the Server Components re-render and the nav re-filters
// to the new branch's enabled modules. Data isn't reloaded per branch — only which
// modules are visible changes.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type BranchOption = { id: string; name: string };

export function BranchSwitcher({
  branches,
  currentBranchId,
}: {
  branches: BranchOption[];
  currentBranchId: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  // Nothing to switch between if there's 0 or 1 branch — hide the control.
  if (branches.length < 2) return null;

  async function onChange(id: string) {
    if (id === currentBranchId) return;
    setSaving(true);
    try {
      await fetch("/api/branches/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branchId: id }),
      });
      // Re-run the server render so the nav reflects the new branch.
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Select value={currentBranchId} onValueChange={onChange} disabled={saving}>
      <SelectTrigger className="h-9 w-full" aria-label="Switch branch">
        <span className="flex min-w-0 items-center gap-2">
          <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {branches.map((b) => (
          <SelectItem key={b.id} value={b.id}>
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
