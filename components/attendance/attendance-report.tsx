// The "View Reports" tab. Date range + class/section filters drive a batched
// report fetch; a debounced name filter narrows the visible rows client-side.
// Desktop shows the student×date grid; mobile collapses to a per-student list.
// "Export to CSV" is just a link to the report API with format=csv.
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import type { ClassWithSections } from "@/lib/students";
import type { ReportRow } from "@/lib/attendance";
import { STATUS_DOT, type AttendanceStatus } from "@/lib/attendance-status";
import { Button } from "@/components/ui/button";
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

const ALL = "all";
function monthStart() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), 1)).toISOString().slice(0, 10);
}
const todayStr = () => new Date().toISOString().slice(0, 10);

export function AttendanceReport({ classes }: { classes: ClassWithSections[] }) {
  const [start, setStart] = useState(monthStart());
  const [end, setEnd] = useState(todayStr());
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [data, setData] = useState<{ dateKeys: string[]; rows: ReportRow[] } | null>(null);
  const [loading, setLoading] = useState(false);

  // Debounced name filter: type freely, the list filters ~300ms after you stop.
  const [nameInput, setNameInput] = useState("");
  const [nameFilter, setNameFilter] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setNameFilter(nameInput.trim().toLowerCase()), 300);
    return () => clearTimeout(t);
  }, [nameInput]);

  const sectionOptions = classes.find((c) => c.id === classId)?.sections ?? [];

  // Fetch the report whenever the range/filters change (one batched request).
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = new URLSearchParams({ start, end });
    if (classId) qs.set("classId", classId);
    if (sectionId) qs.set("sectionId", sectionId);
    fetch(`/api/attendance/report?${qs.toString()}`)
      .then((r) => r.json())
      .then((d) => !cancelled && setData(d))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [start, end, classId, sectionId]);

  // The CSV download URL mirrors the current filters.
  const csvUrl = useMemo(() => {
    const qs = new URLSearchParams({ start, end, format: "csv" });
    if (classId) qs.set("classId", classId);
    if (sectionId) qs.set("sectionId", sectionId);
    return `/api/attendance/report?${qs.toString()}`;
  }, [start, end, classId, sectionId]);

  const rows = useMemo(
    () => (data?.rows ?? []).filter((r) => !nameFilter || r.name.toLowerCase().includes(nameFilter)),
    [data, nameFilter]
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="r-start">From</Label>
          <Input id="r-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-end">To</Label>
          <Input id="r-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Class</Label>
          <Select
            value={classId || ALL}
            onValueChange={(v) => {
              setClassId(v === ALL ? "" : v);
              setSectionId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All classes</SelectItem>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Section</Label>
          <Select
            value={sectionId || ALL}
            onValueChange={(v) => setSectionId(v === ALL ? "" : v)}
            disabled={!classId}
          >
            <SelectTrigger>
              <SelectValue placeholder="All sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sections</SelectItem>
              {sectionOptions.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Filter by student name…"
          className="sm:max-w-xs"
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
        />
        {/* CSV export: a plain link to the API with format=csv. The browser sees
            the attachment header and downloads it (cookies are sent automatically). */}
        <Button asChild variant="outline" className="gap-2">
          <a href={csvUrl} download>
            <Download className="h-4 w-4" /> Export to CSV
          </a>
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No attendance data for these filters.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* DESKTOP grid (student × date). Horizontal scroll for long ranges. */}
          <div className="hidden overflow-x-auto rounded-md border md:block">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="sticky left-0 z-10 bg-background p-2 text-left font-medium">Student</th>
                  {data?.dateKeys.map((d) => (
                    <th key={d} className="p-1 text-center text-xs font-medium text-muted-foreground">
                      {d.slice(8)}
                    </th>
                  ))}
                  <th className="p-2 text-center font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="sticky left-0 z-10 bg-background p-2">
                      <Link href={`/principal/students/${row.id}`} className="hover:underline">
                        {row.name}
                      </Link>
                    </td>
                    {data?.dateKeys.map((d) => {
                      const status = row.statuses[d] as AttendanceStatus | undefined;
                      return (
                        <td key={d} className="p-1 text-center">
                          <span
                            className={`mx-auto block h-5 w-5 rounded ${status ? STATUS_DOT[status] : "bg-muted"}`}
                            title={status ?? "—"}
                          />
                        </td>
                      );
                    })}
                    <td className="p-2 text-center font-medium">{row.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MOBILE list. */}
          <div className="space-y-2 md:hidden">
            {rows.map((row) => (
              <Card key={row.id}>
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <Link href={`/principal/students/${row.id}`} className="font-medium hover:underline">
                      {row.name}
                    </Link>
                    <span className="text-sm font-semibold">{row.percentage}%</span>
                  </div>
                  <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                    <span>P {row.counts.present}</span>
                    <span>A {row.counts.absent}</span>
                    <span>L {row.counts.late}</span>
                    <span>HD {row.counts.halfDay}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
