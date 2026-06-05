// Parent test reports list: per child, a subject summary (latest score + trend).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { gradeColorClass } from "@/lib/grades";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Subject = { subjectName: string; testName: string; obtainedMarks: number; totalMarks: number; percentage: number; grade: string; trend: number | null };
type Child = { studentId: string; studentName: string; className: string | null; subjects: Subject[] };

export function ParentTestReports() {
  const [children, setChildren] = useState<Child[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => { fetch("/api/parent/test-reports").then((r) => r.json()).then((j) => setChildren(j.data ?? [])); }, []);
  if (children.length === 0) return <div className="space-y-4"><h1 className="text-2xl font-bold">Test Reports</h1><Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No test scores yet.</CardContent></Card></div>;

  const child = children[active];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Test Reports</h1>

      {children.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {children.map((c, i) => <button key={c.studentId} onClick={() => setActive(i)} className={`rounded-full border px-3 py-1 text-sm ${i === active ? "bg-primary text-primary-foreground" : ""}`}>{c.studentName}</button>)}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{child.studentName}{child.className ? ` · Class ${child.className}` : ""}</p>
        <Button asChild size="sm" variant="outline"><Link href={`/parent/test-reports/${child.studentId}`}>View details & trends</Link></Button>
      </div>

      {child.subjects.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No scores recorded yet.</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {child.subjects.map((s) => (
            <Card key={s.subjectName}><CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="font-medium">{s.subjectName}</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${gradeColorClass(s.grade)}`}>{s.grade}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{s.testName}: {s.obtainedMarks}/{s.totalMarks} ({s.percentage}%)</p>
              {s.trend !== null && (
                <p className={`mt-1 flex items-center gap-1 text-xs ${s.trend > 0 ? "text-green-600" : s.trend < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                  {s.trend > 0 ? <TrendingUp className="h-3 w-3" /> : s.trend < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                  {s.trend > 0 ? "+" : ""}{s.trend}% vs previous test
                </p>
              )}
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
