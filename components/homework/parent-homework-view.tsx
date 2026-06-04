// Parent homework screen (client). Current/Past tabs (drive the URL ?status),
// a child filter when there's more than one child, and homework grouped under
// each child's name + class as a section header.
"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { HomeworkChildGroup } from "@/lib/homework";
import { ParentHomeworkCard } from "@/components/homework/parent-homework-card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ALL = "all";

export function ParentHomeworkView({
  groups,
  status,
  childFilter,
}: {
  groups: HomeworkChildGroup[];
  status: string;
  childFilter: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const past = status === "ARCHIVED";

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  const visible = childFilter ? groups.filter((g) => g.child.id === childFilter) : groups;
  const hasAny = visible.some((g) => g.items.length > 0);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Homework</h1>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={past ? "ARCHIVED" : "ACTIVE"} onValueChange={(v) => setParam("status", v)}>
          <TabsList>
            <TabsTrigger value="ACTIVE">Current</TabsTrigger>
            <TabsTrigger value="ARCHIVED">Past</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Child filter — only useful with more than one child. */}
        {groups.length > 1 && (
          <Select value={childFilter || ALL} onValueChange={(v) => setParam("child", v)}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="All children" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All children</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.child.id} value={g.child.id}>
                  {g.child.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {!hasAny ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {past ? "No past homework in the last 30 days." : "No current homework. 🎉"}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {visible.map((g) =>
            g.items.length === 0 ? null : (
              <section key={g.child.id} className="space-y-2">
                {/* Group header: child name + class (only show when >1 child or filtered) */}
                {groups.length > 1 && (
                  <h2 className="text-sm font-semibold text-muted-foreground">
                    {g.child.name} · Class {g.child.className ?? "—"}
                  </h2>
                )}
                <div className="space-y-3">
                  {g.items.map((hw) => (
                    <ParentHomeworkCard key={hw.id} hw={hw} past={past} />
                  ))}
                </div>
              </section>
            )
          )}
        </div>
      )}
    </div>
  );
}
