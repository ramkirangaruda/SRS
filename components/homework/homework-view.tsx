// The principal/teacher homework screen. Tabs (Active/Archived) + search +
// filters drive the URL; the server re-fetches and re-renders. A floating action
// button opens the full-page add form.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";
import type { HomeworkItem } from "@/lib/homework";
import type { ClassWithSections } from "@/lib/students";
import { HomeworkCard } from "@/components/homework/homework-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; name: string };
type SubjectOption = { id: string; name: string; classId: string };

type Props = {
  homework: HomeworkItem[];
  classes: ClassWithSections[];
  subjects: SubjectOption[];
  assigners: Option[];
  total: number;
  page: number;
  totalPages: number;
  filters: {
    status: string;
    search: string;
    classId: string;
    sectionId: string;
    subjectId: string;
    assignedById: string;
  };
};

const ALL = "all";

export function HomeworkView({ homework, classes, subjects, assigners, total, page, totalPages, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchText, setSearchText] = useState(filters.search);

  const archived = filters.status === "ARCHIVED";
  const sectionOptions = classes.find((c) => c.id === filters.classId)?.sections ?? [];
  const subjectOptions = filters.classId ? subjects.filter((s) => s.classId === filters.classId) : subjects;

  function updateParams(updates: Record<string, string | null>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "" || v === ALL) params.delete(k);
      else params.set(k, v);
    }
    if (resetPage) params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (searchText === filters.search) return;
    const t = setTimeout(() => updateParams({ search: searchText }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  return (
    <div className="space-y-4 pb-20">
      <h1 className="text-2xl font-bold">Homework</h1>

      {/* Tabs switch the status filter */}
      <Tabs value={archived ? "ARCHIVED" : "ACTIVE"} onValueChange={(v) => updateParams({ status: v })}>
        <TabsList>
          <TabsTrigger value="ACTIVE">Active</TabsTrigger>
          <TabsTrigger value="ARCHIVED">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + filters */}
      <div className="flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search homework…"
            className="pl-9"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Select value={filters.classId || ALL} onValueChange={(v) => updateParams({ classId: v, sectionId: null, subjectId: null })}>
          <SelectTrigger className="lg:w-36"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.sectionId || ALL} onValueChange={(v) => updateParams({ sectionId: v })} disabled={!filters.classId}>
          <SelectTrigger className="lg:w-36"><SelectValue placeholder="Section" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sections</SelectItem>
            {sectionOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.subjectId || ALL} onValueChange={(v) => updateParams({ subjectId: v })}>
          <SelectTrigger className="lg:w-36"><SelectValue placeholder="Subject" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All subjects</SelectItem>
            {subjectOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filters.assignedById || ALL} onValueChange={(v) => updateParams({ assignedById: v })}>
          <SelectTrigger className="lg:w-40"><SelectValue placeholder="Assigned by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Anyone</SelectItem>
            {assigners.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <p className="text-sm text-muted-foreground">{total} {archived ? "archived" : "active"} homework</p>

      {/* List */}
      {homework.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No homework found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {homework.map((hw) => (
            <HomeworkCard key={hw.id} hw={hw} archived={archived} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) }, false)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateParams({ page: String(page + 1) }, false)}>Next</Button>
          </div>
        </div>
      )}

      {/* Floating Action Button → full-page add form. Sits above the mobile nav. */}
      <Link
        href="/principal/homework/new"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-6 md:right-6"
        aria-label="Add homework"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
