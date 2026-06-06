// Principal/Teacher virtual classroom manager. Tabs: Upcoming, Completed,
// Calendar. Live status is computed server-side; we re-poll every 30s so a class
// flips to LIVE / COMPLETED without a manual refresh.
"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Video, Pencil, Trash2, Film, ExternalLink } from "lucide-react";
import type { ClassWithSections } from "@/lib/students";
import type { VCItem } from "@/lib/virtual-classroom";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { CalendarView } from "@/components/calendar-view";
import { VCStatusBadge } from "@/components/virtual-classroom/vc-status-badge";
import { VCForm } from "@/components/virtual-classroom/vc-form";

type Opt = { id: string; name: string };

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function VCView({ classes, teachers }: { classes: ClassWithSections[]; teachers: Opt[] }) {
  const [items, setItems] = useState<VCItem[]>([]);
  const [tab, setTab] = useState<"upcoming" | "completed" | "calendar">("upcoming");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VCItem | null>(null);
  const [recordingFor, setRecordingFor] = useState<VCItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // For the calendar tab we want ALL classes; the list tabs use their filter.
  const load = useCallback(async () => {
    const filter = tab === "calendar" ? "all" : tab;
    const res = await fetch(`/api/virtual-classroom?filter=${filter}`);
    if (res.ok) { const j = await res.json(); setItems(j.items); }
  }, [tab]);

  useEffect(() => { load(); }, [load]);
  // Re-poll every 30s to keep LIVE/COMPLETED status fresh.
  useEffect(() => {
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  async function remove(id: string) {
    const res = await fetch(`/api/virtual-classroom/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    toast.success("Class deleted");
    setDeleteId(null);
    load();
  }

  function openNew() { setEditing(null); setFormOpen(true); }
  function openEdit(item: VCItem) { setEditing(item); setFormOpen(true); }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button onClick={openNew}><Plus className="mr-1 h-4 w-4" /> Schedule</Button>
      </div>

      {tab === "calendar" ? (
        <CalendarView
          year={new Date().getFullYear()}
          month={new Date().getMonth() + 1}
          onMonthChange={() => { /* all items are loaded; calendar filters client-side */ }}
          items={items.map((i) => ({ ...i, date: i.scheduledAt }))}
          renderDay={(_key, dayItems) => (
            <div className="space-y-0.5">
              {dayItems.slice(0, 2).map((i) => <div key={i.id} className="truncate rounded bg-primary/10 px-1 text-[10px]">{i.title}</div>)}
              {dayItems.length > 2 && <div className="text-[10px] text-muted-foreground">+{dayItems.length - 2}</div>}
            </div>
          )}
          renderDetails={(_key, dayItems) => (
            <div className="space-y-2">
              {dayItems.length === 0 ? <p className="text-sm text-muted-foreground">No classes.</p> : dayItems.map((i) => (
                <div key={i.id} className="rounded border p-2 text-sm">
                  <div className="flex items-center justify-between"><span className="font-medium">{i.title}</span><VCStatusBadge status={i.status} /></div>
                  <p className="text-xs text-muted-foreground">{timeLabel(i.scheduledAt)} · {i.className}{i.sectionName ? `-${i.sectionName}` : ""}</p>
                </div>
              ))}
            </div>
          )}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.length === 0 ? (
            <p className="text-sm text-muted-foreground">No {tab} classes.</p>
          ) : items.map((i) => (
            <Card key={i.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2"><Video className="h-4 w-4 text-muted-foreground" /><span className="font-medium leading-tight">{i.title}</span></div>
                  <VCStatusBadge status={i.status} />
                </div>
                <p className="text-xs text-muted-foreground">{formatDate(i.scheduledAt)} · {timeLabel(i.scheduledAt)} · {i.duration}min</p>
                <p className="text-xs text-muted-foreground">{i.className}{i.sectionName ? `-${i.sectionName}` : ""}{i.subjectName ? ` · ${i.subjectName}` : ""} · {i.hostName}</p>
                <div className="flex flex-wrap gap-2 pt-1">
                  {i.status === "LIVE" && <Button size="sm" asChild><a href={i.meetingLink} target="_blank"><ExternalLink className="mr-1 h-3 w-3" /> Join</a></Button>}
                  {i.recordingUrl && <Button size="sm" variant="outline" asChild><a href={i.recordingUrl} target="_blank"><Film className="mr-1 h-3 w-3" /> Recording</a></Button>}
                  <Button size="sm" variant="ghost" onClick={() => openEdit(i)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => setRecordingFor(i)} title="Add recording"><Film className="h-3 w-3" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(i.id)}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <VCForm open={formOpen} onOpenChange={setFormOpen} classes={classes} teachers={teachers} editing={editing} onSaved={load} />
      {recordingFor && <RecordingDialog item={recordingFor} onClose={() => setRecordingFor(null)} onSaved={() => { setRecordingFor(null); load(); }} />}
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(v) => !v && setDeleteId(null)}
        title="Delete this class?"
        description="This removes the scheduled class. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={() => { if (deleteId) remove(deleteId); }}
      />
    </div>
  );
}

// Small dialog to attach a recording link to a finished class.
function RecordingDialog({ item, onClose, onSaved }: { item: VCItem; onClose: () => void; onSaved: () => void }) {
  const [url, setUrl] = useState(item.recordingUrl ?? "");
  const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    const res = await fetch(`/api/virtual-classroom/${item.id}/recording`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ recordingUrl: url }) });
    setBusy(false);
    if (!res.ok) { toast.error("Save failed"); return; }
    toast.success("Recording saved");
    onSaved();
  }
  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Recording link</DialogTitle></DialogHeader>
        <div className="space-y-1">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://drive.google.com/…" />
          <p className="text-xs text-muted-foreground">Paste a link to the recorded session. Saving marks the class completed.</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
