// Parent/student E-Learning: browse by category, watch tutorials (read-only),
// and submit assignments (file upload, validated server-side: OPEN + not past
// due + not already submitted). Graded work shows marks + feedback.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Video, FileText, LinkIcon, ExternalLink, Download, Upload } from "lucide-react";
import type { StoredFile } from "@/lib/upload-constants";
import { CategoryIcon } from "@/components/elearning/category-icon";
import { FileUpload } from "@/components/file-upload";
import { DueBadge } from "@/components/homework/due-badge";
import { dayKey, formatKey } from "@/lib/calendar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Cat = { id: string; name: string; icon: string | null; color: string | null };
type Tut = { id: string; title: string; type: string; description: string | null; embedUrl: string | null; fileUrl: string | null; linkUrl: string | null; categoryName: string | null };
type Asn = { id: string; title: string; description: string | null; dueDate: string; status: string; totalMarks: number | null; categoryName: string | null; submission: { submittedAt: string; grade: string | null; feedback: string | null } | null };

const ALL = "all";
const TUT_ICON: Record<string, typeof Video> = { VIDEO: Video, DOCUMENT: FileText, LINK: LinkIcon };

export function ParentElearning() {
  const [cats, setCats] = useState<Cat[]>([]);
  const [tuts, setTuts] = useState<Tut[]>([]);
  const [asns, setAsns] = useState<Asn[]>([]);
  const [cat, setCat] = useState("");
  const [submitFor, setSubmitFor] = useState<Asn | null>(null);
  const [file, setFile] = useState<StoredFile[]>([]);

  const load = useCallback(() => {
    const q = cat ? `?categoryId=${cat}` : "";
    fetch("/api/parent/elearning/categories").then((r) => r.json()).then((j) => setCats(j.data ?? []));
    fetch(`/api/parent/elearning/tutorials${q}`).then((r) => r.json()).then((j) => setTuts(j.data ?? []));
    fetch(`/api/parent/elearning/assignments${q}`).then((r) => r.json()).then((j) => setAsns(j.data ?? []));
  }, [cat]);
  useEffect(load, [load]);

  const open = useMemo(() => asns.filter((a) => !a.submission && a.status === "OPEN"), [asns]);
  const done = useMemo(() => asns.filter((a) => a.submission), [asns]);

  async function submit() {
    if (!submitFor || !file[0]) return toast.error("Pick a file");
    const res = await fetch(`/api/parent/elearning/assignments/${submitFor.id}/submit`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fileUrl: file[0].url }) });
    if (!res.ok) { const j = await res.json().catch(() => ({})); return toast.error(j.error ?? "Failed"); }
    toast.success("Submitted"); setSubmitFor(null); setFile([]); load();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Learning</h1>

      {/* Category filter chips */}
      <div className="flex flex-wrap gap-2">
        <button onClick={() => setCat("")} className={`rounded-full border px-3 py-1 text-sm ${cat === "" ? "bg-primary text-primary-foreground" : ""}`}>All</button>
        {cats.map((c) => <button key={c.id} onClick={() => setCat(c.id)} className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm ${cat === c.id ? "bg-primary text-primary-foreground" : ""}`}><CategoryIcon icon={c.icon} className="h-3.5 w-3.5" /> {c.name}</button>)}
      </div>

      <Tabs defaultValue="tutorials">
        <TabsList><TabsTrigger value="tutorials">Tutorials</TabsTrigger><TabsTrigger value="assignments">Assignments</TabsTrigger></TabsList>

        <TabsContent value="tutorials" className="space-y-2 pt-3">
          {tuts.length === 0 ? <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">No tutorials.</p> : tuts.map((t) => {
            const Icon = TUT_ICON[t.type] ?? LinkIcon;
            const href = t.type === "DOCUMENT" ? t.fileUrl : t.type === "LINK" ? t.linkUrl : t.embedUrl;
            return (
              <Card key={t.id}><CardContent className="flex items-center gap-3 p-3">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0 flex-1"><p className="font-medium">{t.title}</p>{t.description && <p className="line-clamp-1 text-xs text-muted-foreground">{t.description}</p>}</div>
                {href && (t.type === "DOCUMENT" ? <a href={href} download className="text-blue-600"><Download className="h-4 w-4" /></a> : <a href={t.type === "VIDEO" ? `https://www.youtube.com/${href.includes("embed") ? "" : ""}${href}` : href} target="_blank" rel="noopener noreferrer" className="text-blue-600"><ExternalLink className="h-4 w-4" /></a>)}
              </CardContent></Card>
            );
          })}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4 pt-3">
          <div className="space-y-2">
            <p className="text-sm font-semibold">Open</p>
            {open.length === 0 ? <p className="text-sm text-muted-foreground">Nothing due.</p> : open.map((a) => (
              <Card key={a.id}><CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div><p className="font-medium">{a.title}</p><DueBadge dueDate={a.dueDate} /></div>
                <Button size="sm" className="gap-1" onClick={() => setSubmitFor(a)}><Upload className="h-4 w-4" /> Submit</Button>
              </CardContent></Card>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-sm font-semibold">Completed</p>
            {done.length === 0 ? <p className="text-sm text-muted-foreground">No submissions yet.</p> : done.map((a) => (
              <Card key={a.id}><CardContent className="p-3">
                <div className="flex items-center justify-between"><p className="font-medium">{a.title}</p><Badge variant="success">Submitted</Badge></div>
                <p className="text-xs text-muted-foreground">on {formatKey(dayKey(a.submission!.submittedAt))}</p>
                {a.submission!.grade != null && <p className="mt-1 text-sm">Grade: <span className="font-semibold">{a.submission!.grade}{a.totalMarks ? `/${a.totalMarks}` : ""}</span>{a.submission!.feedback ? ` — ${a.submission!.feedback}` : ""}</p>}
              </CardContent></Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Submit bottom sheet */}
      <Sheet open={!!submitFor} onOpenChange={(o) => !o && setSubmitFor(null)}>
        <SheetContent side="bottom">
          <SheetHeader><SheetTitle>Submit: {submitFor?.title}</SheetTitle></SheetHeader>
          <div className="mt-3 space-y-3">
            <FileUpload value={file} onChange={setFile} maxFiles={1} folder="submissions" />
            <Button className="w-full" onClick={submit} disabled={!file[0]}>Submit assignment</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
