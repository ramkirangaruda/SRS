// Parent progress reports: PUBLISHED report cards per child, View + Download PDF.
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Row = { id: string; studentName: string; className: string | null; term: string; overallGrade: string | null; rank: number | null };

export function ParentReports() {
  const [rows, setRows] = useState<Row[] | null>(null);
  useEffect(() => { fetch("/api/parent/progress-reports").then((r) => r.json()).then((j) => setRows(j.data ?? [])); }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Report Cards</h1>
      {rows === null ? null : rows.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Report cards will be available here once published by the school.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id}><CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div>
                <p className="font-medium">{r.studentName} <Badge variant="secondary" className="ml-1">{r.term}</Badge></p>
                <p className="text-xs text-muted-foreground">{r.className ?? "—"} · Grade {r.overallGrade ?? "—"}{r.rank ? ` · Rank ${r.rank}` : ""}</p>
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm" variant="outline" className="gap-1"><Link href={`/print/progress-report/${r.id}`} target="_blank"><Eye className="h-4 w-4" /> View</Link></Button>
                <Button asChild size="sm" className="gap-1"><Link href={`/print/progress-report/${r.id}?print=1`} target="_blank"><Download className="h-4 w-4" /> PDF</Link></Button>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
