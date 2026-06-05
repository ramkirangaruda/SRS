// Principal/teacher diary feed: filters + infinite scroll, grouped under date
// headers ("Today", "Yesterday", "June 2, 2026").
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import type { DiaryItem } from "@/lib/diary";
import type { ClassWithSections } from "@/lib/students";
import { useInfiniteFeed, FeedSentinel } from "@/components/infinite-feed";
import { DiaryCard } from "@/components/diary/diary-card";
import { dateHeader, dayGroupKey } from "@/lib/date-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Option = { id: string; name: string };
const ALL = "all";

export function DiaryFeed({
  classes,
  authors,
  currentUserId,
  currentRole,
}: {
  classes: ClassWithSections[];
  authors: Option[];
  currentUserId: string;
  currentRole: string;
}) {
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [authorId, setAuthorId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // The endpoint string encodes the filters; when it changes the feed reloads.
  const endpoint = useMemo(() => {
    const p = new URLSearchParams();
    if (classId) p.set("classId", classId);
    if (sectionId) p.set("sectionId", sectionId);
    if (authorId) p.set("authorId", authorId);
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    return `/api/diary?${p.toString()}`;
  }, [classId, sectionId, authorId, startDate, endDate]);

  const { items, setItems, loading, hasMore, loadMore, initialized } = useInfiniteFeed<DiaryItem>(endpoint);
  const sectionOptions = classes.find((c) => c.id === classId)?.sections ?? [];

  // Group consecutive items by calendar day for the headers.
  const groups = useMemo(() => {
    const out: { key: string; header: string; items: DiaryItem[] }[] = [];
    for (const it of items) {
      const key = dayGroupKey(it.date);
      const last = out[out.length - 1];
      if (last && last.key === key) last.items.push(it);
      else out.push({ key, header: dateHeader(it.date), items: [it] });
    }
    return out;
  }, [items]);

  function onDeleted(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <div className="space-y-4 pb-20">
      <h1 className="text-2xl font-bold">School Diary</h1>

      {/* Filters */}
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <Select value={classId || ALL} onValueChange={(v) => { setClassId(v === ALL ? "" : v); setSectionId(""); }}>
          <SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={sectionId || ALL} onValueChange={(v) => setSectionId(v === ALL ? "" : v)} disabled={!classId}>
          <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sections</SelectItem>
            {sectionOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={authorId || ALL} onValueChange={(v) => setAuthorId(v === ALL ? "" : v)}>
          <SelectTrigger><SelectValue placeholder="Posted by" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Anyone</SelectItem>
            {authors.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div>
          <Label className="sr-only">From</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div>
          <Label className="sr-only">To</Label>
          <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      {/* Feed */}
      {initialized && items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No diary entries.</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.key} className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">{g.header}</h2>
              <div className="space-y-3">
                {g.items.map((entry) => (
                  <DiaryCard key={entry.id} entry={entry} currentUserId={currentUserId} currentRole={currentRole} onDeleted={onDeleted} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Loading skeletons + the IntersectionObserver sentinel */}
      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      )}
      <FeedSentinel onVisible={loadMore} disabled={!hasMore || loading} />

      {/* FAB → new entry */}
      <Link
        href="/principal/diary/new"
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 md:bottom-6 md:right-6"
        aria-label="New diary entry"
      >
        <Plus className="h-6 w-6" />
      </Link>
    </div>
  );
}
