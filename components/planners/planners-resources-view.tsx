// Planners & Resources hub (principal + teacher). Two tabs:
//   • Planners — filterable card list; click a card to view/edit/duplicate.
//   • Resources — folder view (by subject) or flat list, search, upload, batch,
//     download (atomic counter).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Plus, Search, Folder, List as ListIcon, FileText, Download, Upload, Pencil, Trash2, Globe } from "lucide-react";
import type { ClassWithSections } from "@/lib/students";
import { PLANNER_TYPES, RESOURCE_TYPES } from "@/lib/planners";
import { formatDate } from "@/lib/format";
import { formatBytes } from "@/lib/upload-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PlannerForm } from "@/components/planners/planner-form";
import { PlannerDetail } from "@/components/planners/planner-detail";
import { ResourceForm } from "@/components/planners/resource-form";

type Opt = { id: string; name: string };
type Planner = { id: string; title: string; description: string | null; type: string; fileUrl: string | null; fileName: string | null; classId: string | null; subjectId: string | null; className: string | null; subjectName: string | null; createdById: string; createdByName: string | null; createdAt: string };
type Resource = { id: string; title: string; description: string | null; fileUrl: string | null; externalUrl: string | null; fileName: string | null; fileSize: number | null; fileType: string | null; type: string; downloadCount: number; isPublic: boolean; subjectId: string | null; subjectName: string | null; uploadedById: string; uploadedByName: string | null; createdAt: string };

export function PlannersResourcesView({ classes, subjects, currentUserId, isPrincipal }: { classes: ClassWithSections[]; subjects: Opt[]; currentUserId: string; isPrincipal: boolean }) {
  return (
    <Tabs defaultValue="planners" className="space-y-4">
      <TabsList>
        <TabsTrigger value="planners">Planners</TabsTrigger>
        <TabsTrigger value="resources">Resources</TabsTrigger>
      </TabsList>
      <TabsContent value="planners"><PlannersTab classes={classes} subjects={subjects} currentUserId={currentUserId} isPrincipal={isPrincipal} /></TabsContent>
      <TabsContent value="resources"><ResourcesTab subjects={subjects} currentUserId={currentUserId} isPrincipal={isPrincipal} /></TabsContent>
    </Tabs>
  );
}

// ---- PLANNERS ----
function PlannersTab({ classes, subjects, currentUserId, isPrincipal }: { classes: ClassWithSections[]; subjects: Opt[]; currentUserId: string; isPrincipal: boolean }) {
  const [planners, setPlanners] = useState<Planner[]>([]);
  const [type, setType] = useState("ALL");
  const [classId, setClassId] = useState("ALL");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<Planner | null>(null);

  const load = useCallback(async () => {
    const qs = new URLSearchParams();
    if (type !== "ALL") qs.set("type", type);
    if (classId !== "ALL") qs.set("classId", classId);
    if (search) qs.set("search", search);
    const res = await fetch(`/api/planners?${qs}`);
    if (res.ok) { const j = await res.json(); setPlanners(j.data ?? []); }
  }, [type, classId, search]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-44"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search planners…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={type} onValueChange={setType}><SelectTrigger className="w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All types</SelectItem>{PLANNER_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
        <Select value={classId} onValueChange={setClassId}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All classes</SelectItem>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select>
        <Button onClick={() => setFormOpen(true)}><Plus className="mr-1 h-4 w-4" /> Create</Button>
      </div>

      {planners.length === 0 ? <p className="text-sm text-muted-foreground">No planners yet.</p> : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {planners.map((p) => (
            <button key={p.id} onClick={() => setDetail(p)} className="text-left">
              <Card className="h-full transition hover:border-primary/50">
                <CardContent className="space-y-1.5 p-4">
                  <div className="flex items-start justify-between gap-2"><span className="font-medium leading-tight">{p.title}</span><Badge variant="secondary" className="shrink-0">{p.type.replace(/_/g, " ")}</Badge></div>
                  <p className="text-xs text-muted-foreground">{p.className ? `Class ${p.className}` : "—"}{p.subjectName ? ` · ${p.subjectName}` : ""}</p>
                  {p.description && <p className="line-clamp-2 text-xs text-muted-foreground">{p.description}</p>}
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">{p.fileUrl && <FileText className="h-3 w-3" />} by {p.createdByName} · {formatDate(p.createdAt)}</p>
                </CardContent>
              </Card>
            </button>
          ))}
        </div>
      )}

      <PlannerForm open={formOpen} onOpenChange={setFormOpen} classes={classes} editing={null} onSaved={load} />
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="sr-only">Planner</DialogTitle></DialogHeader>
          {detail && <PlannerDetail planner={detail} classes={classes} canManage={isPrincipal || detail.createdById === currentUserId} onChanged={() => { load(); setDetail(null); }} onDeleted={() => { load(); setDetail(null); }} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---- RESOURCES ----
function ResourcesTab({ subjects, currentUserId, isPrincipal }: { subjects: Opt[]; currentUserId: string; isPrincipal: boolean }) {
  const [view, setView] = useState<"folders" | "list">("folders");
  const [folders, setFolders] = useState<{ subjectId: string | null; subjectName: string; count: number }[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [subjectId, setSubjectId] = useState("ALL");
  const [type, setType] = useState("ALL");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const batchRef = useRef<HTMLInputElement>(null);

  const loadFolders = useCallback(async () => {
    const res = await fetch("/api/resources/subjects");
    if (res.ok) { const j = await res.json(); setFolders(j.subjects ?? []); }
  }, []);
  const loadList = useCallback(async () => {
    const qs = new URLSearchParams();
    if (subjectId !== "ALL") qs.set("subjectId", subjectId);
    if (type !== "ALL") qs.set("type", type);
    if (search) qs.set("search", search);
    const res = await fetch(`/api/resources?${qs}`);
    if (res.ok) { const j = await res.json(); setResources(j.data ?? []); }
  }, [subjectId, type, search]);

  useEffect(() => { loadFolders(); }, [loadFolders]);
  useEffect(() => { if (view === "list") { const t = setTimeout(loadList, 250); return () => clearTimeout(t); } }, [view, loadList]);

  function openFolder(sid: string | null) { setSubjectId(sid ?? "UNFILED"); setView("list"); }

  async function download(r: Resource) {
    const res = await fetch(`/api/resources/${r.id}/download`, { method: "PATCH" });
    if (!res.ok) { toast.error("Download failed"); return; }
    const j = await res.json();
    if (j.url) window.open(j.url, "_blank");
    loadList();
  }
  async function del(id: string) {
    const res = await fetch(`/api/resources/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); return; }
    toast.success("Resource deleted"); setDeleteId(null); loadList(); loadFolders();
  }
  async function onBatch(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files; if (!files || files.length === 0) return;
    e.target.value = "";
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("file", f));
    fd.append("type", "DOCUMENT");
    if (subjectId !== "ALL" && subjectId !== "UNFILED") fd.append("subjectId", subjectId);
    toast.loading("Uploading…", { id: "batch" });
    const res = await fetch("/api/resources/batch", { method: "POST", body: fd });
    toast.dismiss("batch");
    if (!res.ok) { toast.error("Batch upload failed"); return; }
    const j = await res.json();
    toast.success(`Uploaded ${j.created} resource${j.created > 1 ? "s" : ""}${j.skipped ? `, ${j.skipped} skipped` : ""}`);
    loadList(); loadFolders();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-md border">
          <button onClick={() => setView("folders")} className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === "folders" ? "bg-muted" : ""}`}><Folder className="h-4 w-4" /> Folders</button>
          <button onClick={() => setView("list")} className={`flex items-center gap-1 px-3 py-1.5 text-sm ${view === "list" ? "bg-muted" : ""}`}><ListIcon className="h-4 w-4" /> List</button>
        </div>
        {view === "list" && (
          <>
            <div className="relative flex-1 min-w-40"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Search resources…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <Select value={type} onValueChange={setType}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All types</SelectItem>{RESOURCE_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select>
          </>
        )}
        <input ref={batchRef} type="file" multiple className="hidden" onChange={onBatch} />
        <Button variant="outline" onClick={() => batchRef.current?.click()}><Upload className="mr-1 h-4 w-4" /> Batch</Button>
        <Button onClick={() => { setEditing(null); setFormOpen(true); }}><Plus className="mr-1 h-4 w-4" /> Upload</Button>
      </div>

      {view === "folders" ? (
        folders.length === 0 ? <p className="text-sm text-muted-foreground">No resources yet.</p> : (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {folders.map((f) => (
              <button key={f.subjectId ?? "unfiled"} onClick={() => openFolder(f.subjectId)} className="text-left">
                <Card className="transition hover:border-primary/50"><CardContent className="flex items-center gap-3 p-4">
                  <Folder className="h-8 w-8 text-primary" />
                  <div><p className="font-medium">{f.subjectName}</p><p className="text-xs text-muted-foreground">{f.count} item{f.count !== 1 ? "s" : ""}</p></div>
                </CardContent></Card>
              </button>
            ))}
          </div>
        )
      ) : (
        resources.length === 0 ? <p className="text-sm text-muted-foreground">No resources match.</p> : (
          <div className="space-y-2">
            {resources.map((r) => (
              <Card key={r.id}><CardContent className="flex flex-wrap items-center gap-3 p-3">
                <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium leading-tight">{r.title} {r.isPublic && <Globe className="h-3 w-3 text-emerald-600" />}</p>
                  <p className="text-xs text-muted-foreground">{r.subjectName ?? "Unfiled"} · {r.type} · {r.fileSize ? formatBytes(r.fileSize) + " · " : ""}{r.downloadCount} downloads · by {r.uploadedByName}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => download(r)}><Download className="mr-1 h-4 w-4" /> Download</Button>
                {(isPrincipal || r.uploadedById === currentUserId) && <>
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(r); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDeleteId(r.id)}><Trash2 className="h-4 w-4" /></Button>
                </>}
              </CardContent></Card>
            ))}
          </div>
        )
      )}

      <ResourceForm open={formOpen} onOpenChange={setFormOpen} subjects={subjects} editing={editing} onSaved={() => { loadList(); loadFolders(); }} />
      <ConfirmDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)} title="Delete this resource?" description="This cannot be undone." confirmLabel="Delete" onConfirm={() => { if (deleteId) del(deleteId); }} />
    </div>
  );
}
