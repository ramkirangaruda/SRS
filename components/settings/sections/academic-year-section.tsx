// Active Academic Year. Switching the active year changes the DEFAULT scope for
// every module (all year-scoped data carries academicYearId) WITHOUT deleting or
// archiving anything — old years stay fully accessible. See the year-scoping note
// in lib/settings.ts.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

type Year = { id: string; name: string; startDate: string; endDate: string; isActive: boolean };

export function AcademicYearSection() {
  const router = useRouter();
  const [years, setYears] = useState<Year[]>([]);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", startDate: "", endDate: "", setActive: false });
  const [confirmYear, setConfirmYear] = useState<Year | null>(null);

  const load = () => fetch("/api/settings/academic-years").then((r) => r.json()).then((j) => setYears(j.years ?? []));
  useEffect(() => { load(); }, []);

  const active = years.find((y) => y.isActive);
  const others = years.filter((y) => !y.isActive);

  async function activate(y: Year) {
    const res = await fetch(`/api/settings/academic-years/${y.id}/activate`, { method: "PATCH" });
    if (!res.ok) { toast.error("Failed"); return; }
    const j = await res.json();
    toast.success(`Active year is now ${j.name}${j.isPast ? " (a past year)" : ""}`);
    setConfirmYear(null); load(); router.refresh();
  }

  async function create() {
    if (!form.name.trim() || !form.startDate || !form.endDate) return toast.error("Fill all fields");
    const res = await fetch("/api/settings/academic-years", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!res.ok) { toast.error("Failed"); return; }
    toast.success("Academic year created"); setCreating(false); setForm({ name: "", startDate: "", endDate: "", setActive: false }); load(); router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-5">
      <Card className="border-primary/40 bg-primary/5">
        <CardContent className="flex items-center justify-between p-4">
          <div><p className="text-xs text-muted-foreground">Active academic year</p><p className="text-2xl font-bold">{active?.name ?? "—"}</p></div>
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </CardContent>
      </Card>

      <div>
        <div className="mb-2 flex items-center justify-between"><h3 className="font-semibold">Previous years</h3><Button size="sm" variant="outline" onClick={() => setCreating((v) => !v)}><Plus className="mr-1 h-4 w-4" /> Create New Year</Button></div>
        {creating && (
          <Card className="mb-3"><CardContent className="space-y-3 p-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1"><Label className="text-xs">Name</Label><Input placeholder="2026-2027" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">Start</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-1"><Label className="text-xs">End</Label><Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.setActive} onChange={(e) => setForm((f) => ({ ...f, setActive: e.target.checked }))} className="h-4 w-4" /> Set as active year</label>
            <Button size="sm" onClick={create}>Create</Button>
          </CardContent></Card>
        )}
        {others.length === 0 ? <p className="text-sm text-muted-foreground">No other years.</p> : (
          <div className="space-y-2">
            {others.map((y) => (
              <Card key={y.id}><CardContent className="flex items-center justify-between gap-2 p-3">
                <div><p className="font-medium">{y.name} {y.endDate < new Date().toISOString() && <Badge variant="secondary">Past</Badge>}</p><p className="text-xs text-muted-foreground">{formatDate(y.startDate)} – {formatDate(y.endDate)}</p></div>
                <Button size="sm" variant="outline" onClick={() => setConfirmYear(y)}>Set active</Button>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmYear}
        onOpenChange={(v) => !v && setConfirmYear(null)}
        title={`Switch active year to ${confirmYear?.name}?`}
        description="Switching the active year changes the default view for all modules — attendance, fees, homework etc. will show the new year's data. Historical data from previous years remains accessible."
        confirmLabel="Switch year"
        onConfirm={() => { if (confirmYear) activate(confirmYear); }}
      />
    </div>
  );
}
