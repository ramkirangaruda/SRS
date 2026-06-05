// Principal/teacher E-Learning: three tabs (Categories, Tutorials, Assignments).
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2, FileText, Video, LinkIcon } from "lucide-react";
import type { ClassWithSections } from "@/lib/students";
import { CategoryIcon } from "@/components/elearning/category-icon";
import { CategoryForm } from "@/components/elearning/category-form";
import { TutorialForm } from "@/components/elearning/tutorial-form";
import { AssignmentForm } from "@/components/elearning/assignment-form";
import { MediaGrid } from "@/components/media-grid";
import { formatDate } from "@/lib/format";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Cat = { id: string; name: string; description: string | null; icon: string | null; color: string | null; tutorialCount: number; assignmentCount: number };
type Tut = { id: string; title: string; type: string; categoryName: string | null; className: string | null; description: string | null; uploadedByName: string | null; createdAt: string };
type Asn = { id: string; title: string; categoryName: string | null; className: string | null; dueDate: string; status: string; submissionCount: number; classStudentCount: number };

const TUT_ICON: Record<string, typeof Video> = { VIDEO: Video, DOCUMENT: FileText, LINK: LinkIcon };

export function ELearningTabs({ classes }: { classes: ClassWithSections[] }) {
  const [cats, setCats] = useState<Cat[]>([]);
  const [tuts, setTuts] = useState<Tut[]>([]);
  const [asns, setAsns] = useState<Asn[]>([]);
  const [catOpen, setCatOpen] = useState(false);
  const [tutOpen, setTutOpen] = useState(false);
  const [asnOpen, setAsnOpen] = useState(false);

  const loadCats = useCallback(() => fetch("/api/elearning/categories").then((r) => r.json()).then((j) => setCats(j.data ?? [])), []);
  const loadTuts = useCallback(() => fetch("/api/elearning/tutorials").then((r) => r.json()).then((j) => setTuts(j.data ?? [])), []);
  const loadAsns = useCallback(() => fetch("/api/elearning/assignments").then((r) => r.json()).then((j) => setAsns(j.data ?? [])), []);
  useEffect(() => { loadCats(); loadTuts(); loadAsns(); }, [loadCats, loadTuts, loadAsns]);

  async function delCat(id: string) {
    const res = await fetch(`/api/elearning/categories/${id}`, { method: "DELETE" });
    if (res.status === 409) { const j = await res.json(); return toast.error(j.error); }
    if (!res.ok) return toast.error("Failed");
    toast.success("Deleted"); loadCats();
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">E-Learning</h1>
      <Tabs defaultValue="categories">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="tutorials">Tutorials</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-3 pt-3">
          <div className="flex justify-end"><Button size="sm" className="gap-1" onClick={() => setCatOpen(true)}><Plus className="h-4 w-4" /> Add Category</Button></div>
          <MediaGrid items={cats} emptyText="No categories." className="grid grid-cols-2 gap-3 sm:grid-cols-3" renderCard={(c) => (
            <Card key={c.id}><CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: (c.color ?? "#3b82f6") + "22", color: c.color ?? "#3b82f6" }}><CategoryIcon icon={c.icon} className="h-5 w-5" /></div>
                <button onClick={() => delCat(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
              <p className="mt-2 font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.tutorialCount} tutorials · {c.assignmentCount} assignments</p>
            </CardContent></Card>
          )} />
        </TabsContent>

        <TabsContent value="tutorials" className="space-y-3 pt-3">
          <div className="flex justify-end"><Button size="sm" className="gap-1" onClick={() => setTutOpen(true)}><Plus className="h-4 w-4" /> Add Tutorial</Button></div>
          <MediaGrid items={tuts} emptyText="No tutorials." className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" renderCard={(t) => {
            const Icon = TUT_ICON[t.type] ?? LinkIcon;
            return (
              <Link key={t.id} href={`/principal/elearning/tutorials/${t.id}`}><Card className="cursor-pointer transition-shadow hover:shadow-md"><CardContent className="p-4">
                <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" /><p className="truncate font-medium">{t.title}</p></div>
                <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">{t.categoryName && <Badge variant="secondary">{t.categoryName}</Badge>}{t.className && <span>{t.className}</span>}</div>
                {t.description && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{t.description}</p>}
              </CardContent></Card></Link>
            );
          }} />
        </TabsContent>

        <TabsContent value="assignments" className="space-y-3 pt-3">
          <div className="flex justify-end"><Button size="sm" className="gap-1" onClick={() => setAsnOpen(true)}><Plus className="h-4 w-4" /> Create Assignment</Button></div>
          <div className="space-y-2">
            {asns.length === 0 ? <p className="rounded-md border p-8 text-center text-sm text-muted-foreground">No assignments.</p> : asns.map((a) => {
              const overdue = new Date(a.dueDate).getTime() < Date.now();
              return (
                <Link key={a.id} href={`/principal/elearning/assignments/${a.id}`}><Card className="cursor-pointer transition-shadow hover:shadow-md"><CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div><p className="font-medium">{a.title}</p><p className="text-xs text-muted-foreground">{a.className ?? "—"}{a.categoryName ? ` · ${a.categoryName}` : ""} · due {formatDate(a.dueDate)}</p></div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{a.submissionCount}/{a.classStudentCount} submitted</span>
                    <Badge variant={a.status === "CLOSED" ? "secondary" : overdue ? "destructive" : "success"}>{a.status}</Badge>
                  </div>
                </CardContent></Card></Link>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <CategoryForm open={catOpen} onOpenChange={setCatOpen} onSaved={loadCats} />
      <TutorialForm open={tutOpen} onOpenChange={setTutOpen} classes={classes} categories={cats} onSaved={loadTuts} />
      <AssignmentForm open={asnOpen} onOpenChange={setAsnOpen} classes={classes} categories={cats} onSaved={loadAsns} />
    </div>
  );
}
