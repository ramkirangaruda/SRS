// Compare two tests for the same class/subject — improvement per student + trend.
"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { ClassWithSections } from "@/lib/students";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Subject = { id: string; name: string; classId: string };
type Cmp = { rows: { studentId: string; studentName: string; marks1: number; marks2: number | null; improvement: number | null }[]; avg1: number; avg2: number; classDelta: number };

export function CompareView({ classes, subjects }: { classes: ClassWithSections[]; subjects: Subject[] }) {
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [t1, setT1] = useState("");
  const [t2, setT2] = useState("");
  const [cmp, setCmp] = useState<Cmp | null>(null);
  const subjectOptions = subjects.filter((s) => s.classId === classId);

  async function run() {
    if (!classId || !subjectId || !t1 || !t2) return;
    const res = await fetch(`/api/test-reports/compare?classId=${classId}&subjectId=${subjectId}&testName1=${encodeURIComponent(t1)}&testName2=${encodeURIComponent(t2)}`);
    setCmp(await res.json());
  }

  return (
    <div className="space-y-4">
      <Link href="/principal/test-reports" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back to test reports</Link>
      <h1 className="text-2xl font-bold">Compare Tests</h1>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1"><Label className="text-xs">Class</Label><Select value={classId} onValueChange={(v) => { setClassId(v); setSubjectId(""); }}><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label className="text-xs">Subject</Label><Select value={subjectId} onValueChange={setSubjectId} disabled={!classId}><SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent>{subjectOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label className="text-xs">Test 1</Label><Input placeholder="Unit Test 1" value={t1} onChange={(e) => setT1(e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Test 2</Label><Input placeholder="Unit Test 2" value={t2} onChange={(e) => setT2(e.target.value)} /></div>
      </div>
      <Button onClick={run} disabled={!classId || !subjectId || !t1 || !t2}>Compare</Button>

      {cmp && (
        <>
          <Card><CardContent className="flex items-center justify-around p-4 text-center">
            <div><p className="text-xs text-muted-foreground">{t1} avg</p><p className="text-xl font-bold">{cmp.avg1}%</p></div>
            <div><p className="text-xs text-muted-foreground">{t2} avg</p><p className="text-xl font-bold">{cmp.avg2}%</p></div>
            <div><p className="text-xs text-muted-foreground">Class change</p><p className={`text-xl font-bold ${cmp.classDelta > 0 ? "text-green-600" : cmp.classDelta < 0 ? "text-red-600" : ""}`}>{cmp.classDelta > 0 ? "+" : ""}{cmp.classDelta}%</p></div>
          </CardContent></Card>

          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead><tr className="border-b bg-muted/40 text-left text-xs"><th className="px-3 py-2">Student</th><th className="px-3 py-2">{t1}</th><th className="px-3 py-2">{t2}</th><th className="px-3 py-2">Change</th></tr></thead>
              <tbody>
                {cmp.rows.map((r) => (
                  <tr key={r.studentId} className="border-b last:border-0">
                    <td className="px-3 py-2">{r.studentName}</td>
                    <td className="px-3 py-2">{r.marks1}</td>
                    <td className="px-3 py-2">{r.marks2 ?? "—"}</td>
                    <td className="px-3 py-2">
                      {r.improvement === null ? "—" : (
                        <span className={`flex items-center gap-1 ${r.improvement > 0 ? "text-green-600" : r.improvement < 0 ? "text-red-600" : "text-muted-foreground"}`}>
                          {r.improvement > 0 ? <TrendingUp className="h-4 w-4" /> : r.improvement < 0 ? <TrendingDown className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                          {r.improvement > 0 ? "+" : ""}{r.improvement}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
