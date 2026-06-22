// Settings → Branches. The principal renames each branch and toggles which
// modules it shows. A "branch" doesn't split data — it's a module profile (see the
// Branch model). Saving re-runs the server render (router.refresh) so the sidebar
// immediately reflects changes to the branch you're currently in.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Building2, Save } from "lucide-react";
import { TOGGLEABLE_MODULES, type ModuleKey } from "@/lib/modules";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Branch = { id: string; name: string; enabledModules: ModuleKey[]; isDefault: boolean };

export function BranchesSection() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/branches")
      .then((r) => r.json())
      .then((j) => setBranches(j.branches ?? []))
      .catch(() => toast.error("Could not load branches"))
      .finally(() => setLoading(false));
  }, []);

  // Update one branch's draft in local state (name or a single module toggle).
  function patchLocal(id: string, change: Partial<Branch>) {
    setBranches((bs) => bs.map((b) => (b.id === id ? { ...b, ...change } : b)));
  }

  function toggleModule(branch: Branch, key: ModuleKey, on: boolean) {
    const next = on
      ? [...branch.enabledModules, key]
      : branch.enabledModules.filter((m) => m !== key);
    patchLocal(branch.id, { enabledModules: next });
  }

  async function save(branch: Branch) {
    if (!branch.name.trim()) return toast.error("Branch name can't be empty");
    setSavingId(branch.id);
    try {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: branch.name.trim(), enabledModules: branch.enabledModules }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(j.error ?? "Failed to save");
        return;
      }
      toast.success(`${branch.name.trim()} saved`);
      // Re-render server components so the sidebar nav reflects the new module set
      // for the branch the principal is currently working in.
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading branches…</p>;
  if (branches.length === 0)
    return <p className="text-sm text-muted-foreground">No branches configured.</p>;

  return (
    <div className="max-w-2xl space-y-5">
      <p className="text-sm text-muted-foreground">
        A branch decides <strong>which modules are visible</strong> when you switch to it from the
        sidebar. Your students, fees and staff are shared across all branches — only the menu
        changes.
      </p>

      {branches.map((branch) => (
        <Card key={branch.id}>
          <CardContent className="space-y-4 p-4">
            <div className="space-y-1">
              <Label className="flex items-center gap-2 text-xs">
                <Building2 className="h-4 w-4 text-muted-foreground" /> Branch name
                {branch.isDefault && <Badge variant="secondary">Default</Badge>}
              </Label>
              <Input
                value={branch.name}
                maxLength={60}
                onChange={(e) => patchLocal(branch.id, { name: e.target.value })}
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Visible modules ({branch.enabledModules.length})
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
                {TOGGLEABLE_MODULES.map((m) => {
                  const checked = branch.enabledModules.includes(m.key);
                  return (
                    <label key={m.key} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="h-4 w-4 shrink-0"
                        checked={checked}
                        onChange={(e) => toggleModule(branch, m.key, e.target.checked)}
                      />
                      <span className="min-w-0 truncate">{m.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <Button size="sm" onClick={() => save(branch)} disabled={savingId === branch.id}>
              <Save className="mr-1 h-4 w-4" />
              {savingId === branch.id ? "Saving…" : "Save"}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
