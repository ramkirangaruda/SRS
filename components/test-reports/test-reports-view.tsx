// Principal/teacher Test Reports: Entry Mode (spreadsheet grid) + View Mode
// (results table + class stats + grade-distribution chart + CSV/print export).
"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { ClassWithSections } from "@/lib/students";
import type { ResultRow } from "@/lib/test-reports";
import { MarksGrid, type RosterStudent } from "@/components/test-reports/marks-grid";
import { GradeDistributionChart } from "@/components/test-reports/grade-distribution-chart";
import { gradeColorClass } from "@/lib/grades";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Subject = { id: string; name: string; classId: string };
type Stats = { count: number; highest: number; lowest: number; average: number; passPercent: number; distribution: { grade: string; count: number }[] };

export function TestReportsView({ classes, subjects }: { classes: ClassWithSections[]; subjects: Subject[] }) {
  // Shared selectors
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [testName, setTestName] = useState("");
  const sections = classes.find((c) => c.id === classId)?.sections ?? [];
  const subjectOptions = subjects.filter((s) => s.classId === classId);

  // Entry mode
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalMarks, setTotalMarks] = useState("100");
  const [roster, setRoster] = useState<RosterStudent[] | null>(null);
  const [existing, setExisting] = useState<Map<string, { obtainedMarks: number; remarks?: string }>>(new Map());

  // View mode
  const [results, setResults] = useState<ResultRow[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [sortKey, setSortKey] = useState<keyof ResultRow>("percentage");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const ready = classId && sectionId && subjectId && testName;

  async function loadRoster() {
    if (!ready || !totalMarks) return toast.error("Fill all test details");
    const [r, e] = await Promise.all([
      fetch(`/api/students?classId=${classId}&sectionId=${sectionId}&pageSize=100`).then((x) => x.json()),
      fetch(`/api/test-reports?classId=${classId}&sectionId=${sectionId}&subjectId=${subjectId}&testName=${encodeURIComponent(testName)}`).then((x) => x.json()),
    ]);
    setRoster(r.data.map((s: { id: string; name: string; admissionNumber: string }) => ({ id: s.id, name: s.name, admissionNumber: s.admissionNumber })));
    setExisting(new Map((e.data ?? []).map((x: ResultRow) => [x.studentId, { obtainedMarks: x.obtainedMarks }])));
  }

  async function saveMarks(records: { studentId: string; obtainedMarks: number; remarks: string }[]) {
    const res = await fetch("/api/test-reports/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId, sectionId, subjectId, testName, date: testDate, totalMarks: Number(totalMarks), records }) });
    if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error(j.error ?? "Save failed"); return false; }
    return true;
  }

  async function loadView() {
    if (!ready) return toast.error("Select class, section, subject and test name");
    const [r, s] = await Promise.all([
      fetch(`/api/test-reports?classId=${classId}&sectionId=${sectionId}&subjectId=${subjectId}&testName=${encodeURIComponent(testName)}`).then((x) => x.json()),
      fetch(`/api/test-reports/stats?classId=${classId}&sectionId=${sectionId}&subjectId=${subjectId}&testName=${encodeURIComponent(testName)}`).then((x) => x.json()),
    ]);
    setResults(r.data ?? []); setStats(s);
  }

  const sorted = results ? [...results].sort((a, b) => { const av = a[sortKey], bv = b[sortKey]; const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv)); return sortDir === "asc" ? cmp : -cmp; }) : [];
  function sortBy(k: keyof ResultRow) { if (k === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc")); else { setSortKey(k); setSortDir("desc"); } }

  function exportCsv() {
    if (!results) return;
    const header = ["Admission", "Name", "Marks", "Total", "Percentage", "Grade", "Rank"];
    const lines = [header.join(","), ...sorted.map((r) => [r.admissionNumber, `"${r.studentName}"`, r.obtainedMarks, r.totalMarks, r.percentage.toFixed(1), r.grade, r.rank].join(","))];
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${testName}.csv`; a.click();
  }

  const Selectors = (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <div className="space-y-1"><Label className="text-xs">Class</Label><Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); setSubjectId(""); }}><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label className="text-xs">Section</Label><Select value={sectionId} onValueChange={setSectionId} disabled={!classId}><SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger><SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label className="text-xs">Subject</Label><Select value={subjectId} onValueChange={setSubjectId} disabled={!classId}><SelectTrigger><SelectValue placeholder="Subject" /></SelectTrigger><SelectContent>{subjectOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
      <div className="space-y-1"><Label className="text-xs">Test name</Label><Input placeholder="Unit Test 1" value={testName} onChange={(e) => setTestName(e.target.value)} /></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Test Reports</h1>
        <Button asChild variant="outline" size="sm"><Link href="/principal/test-reports/compare">Compare tests</Link></Button>
      </div>

      <Tabs defaultValue="entry">
        <TabsList><TabsTrigger value="entry">Entry Mode</TabsTrigger><TabsTrigger value="view">View Mode</TabsTrigger></TabsList>

        <TabsContent value="entry" className="space-y-3 pt-3">
          {Selectors}
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="space-y-1"><Label className="text-xs">Test date</Label><Input type="date" value={testDate} onChange={(e) => setTestDate(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Total marks</Label><Input type="number" value={totalMarks} onChange={(e) => setTotalMarks(e.target.value)} /></div>
            <div className="flex items-end"><Button className="w-full" onClick={loadRoster} disabled={!ready}>Load students</Button></div>
          </div>
          {roster && <MarksGrid roster={roster} totalMarks={Number(totalMarks)} existing={existing} save={saveMarks} onSaved={loadRoster} />}
        </TabsContent>

        <TabsContent value="view" className="space-y-3 pt-3">
          {Selectors}
          <Button onClick={loadView} disabled={!ready}>Load results</Button>

          {stats && stats.count > 0 && (
            <Card><CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Highest" value={stats.highest} /><Stat label="Lowest" value={stats.lowest} /><Stat label="Average %" value={stats.average} /><Stat label="Pass %" value={stats.passPercent} />
              </div>
              <div className="mt-4"><p className="mb-1 text-sm font-medium">Grade distribution</p><GradeDistributionChart data={stats.distribution} /></div>
            </CardContent></Card>
          )}

          {results && (
            <>
              <div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={exportCsv}>Export CSV</Button><Button size="sm" variant="outline" onClick={() => window.print()}>Print / PDF</Button></div>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead><tr className="border-b bg-muted/40 text-left text-xs">
                    {(["studentName", "obtainedMarks", "percentage", "grade", "rank"] as (keyof ResultRow)[]).map((k) => (
                      <th key={k} className="cursor-pointer px-3 py-2" onClick={() => sortBy(k)}>{({ studentName: "Name", obtainedMarks: "Marks", percentage: "%", grade: "Grade", rank: "Rank" } as Record<string, string>)[k]}{sortKey === k ? (sortDir === "asc" ? " ▲" : " ▼") : ""}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {sorted.map((r) => (
                      <tr key={r.id} className="border-b last:border-0">
                        <td className="px-3 py-2"><Link href={`/principal/students/${r.studentId}`} className="hover:underline">{r.studentName}</Link></td>
                        <td className="px-3 py-2">{r.obtainedMarks}/{r.totalMarks}</td>
                        <td className="px-3 py-2">{r.percentage.toFixed(1)}%</td>
                        <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${gradeColorClass(r.grade)}`}>{r.grade}</span></td>
                        <td className="px-3 py-2">{r.rank}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <div><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></div>;
}
