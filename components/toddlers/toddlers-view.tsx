// Staff (principal/teacher) toddler roster: search, add, edit, delete. Each row is
// a card showing the toddler's photo, age, guardian, and an allergy flag.
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, Baby, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ToddlerForm, type Toddler } from "@/components/toddlers/toddler-form";
import { ageFromDob } from "@/lib/toddler-age";

type Opt = { id: string; name: string };

export function ToddlersView({ parents }: { parents: Opt[] }) {
  const [toddlers, setToddlers] = useState<Toddler[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Toddler | null>(null);
  const [del, setDel] = useState<Toddler | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    const res = await fetch(`/api/toddlers?${qs}`);
    if (res.ok) {
      const j = await res.json();
      setToddlers(j.data);
    }
    setLoading(false);
  }, [search]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function remove(t: Toddler) {
    const res = await fetch(`/api/toddlers/${t.id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Delete failed");
      return;
    }
    toast.success("Toddler removed");
    setDel(null);
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search name or guardian…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Add Toddler
        </Button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : toddlers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
            <Baby className="h-8 w-8" />
            <p className="text-sm">{search ? "No toddlers match your search." : "No toddlers yet. Add your first one."}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {toddlers.map((t) => (
            <Card key={t.id}>
              <CardContent className="flex items-center gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {t.photo ? (
                  <img src={t.photo} alt={t.name} className="h-12 w-12 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Baby className="h-6 w-6 text-muted-foreground" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 truncate font-medium leading-tight">
                    {t.name}
                    {t.allergies && (
                      <span className="inline-flex items-center gap-0.5 text-xs font-normal text-amber-600" title={`Allergies: ${t.allergies}`}>
                        <AlertTriangle className="h-3 w-3" /> Allergy
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {ageFromDob(t.dateOfBirth) ?? "Age —"}
                    {t.guardianName ? ` · ${t.guardianName}` : ""}
                    {t.guardianPhone ? ` · ${t.guardianPhone}` : ""}
                  </p>
                  {t.parentId && <Badge variant="secondary" className="mt-1">Parent linked</Badge>}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setFormOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDel(t)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ToddlerForm open={formOpen} onOpenChange={setFormOpen} parents={parents} editing={editing} onSaved={load} />
      <ConfirmDialog
        open={!!del}
        onOpenChange={(v) => !v && setDel(null)}
        title={`Remove ${del?.name}?`}
        description="This removes the toddler's profile. This cannot be undone."
        confirmLabel="Remove"
        onConfirm={() => { if (del) remove(del); }}
      />
    </div>
  );
}
