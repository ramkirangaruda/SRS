// Progress report generation workflow: pick class/section/year/term → preview the
// auto-aggregated data → add per-student remarks → Generate.
"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { ClassWithSections } from "@/lib/students";
import type { StudentReport } from "@/lib/progress-reports";
import { gradeColorClass } from "@/lib/grades";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type YearOpt = { id: string; name: string };
const TERMS = ["TERM1", "TERM2", "TERM3"];

export function GenerateWorkflow({ classes, years, onGenerated }: { classes: ClassWithSections[]; years: YearOpt[]; onGenerated: () => void }) {
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [academicYearId, setAcademicYearId] = useState(years[0]?.id ?? "");
  const [term, setTerm] = useState("TERM1");
  const [preview, setPreview] = useState<StudentReport[] | null>(null);
  const [edits, setEdits] = useState<Record<string, { remarks: string; coCurricular: string; conduct: string }>>({});
  const [busy, setBusy] = useState(false);
  const sections = classes.find((c) => c.id === classId)?.sections ?? [];

  async function loadPreview() {
    if (!classId || !sectionId) return toast.error("Select class and section");
    const res = await fetch(`/api/progress-reports/generate-preview?classId=${classId}&sectionId=${sectionId}`);
    const j = await res.json();
    setPreview(j.data ?? []);
  }

  function setEdit(id: string, field: string, value: string) {
    setEdits((p) => {
      const cur = p[id] ?? { remarks: "", coCurricular: "", conduct: "" };
      return { ...p, [id]: { ...cur, [field]: value } };
    });
  }

  async function generate() {
    if (!preview || !academicYearId) return;
    setBusy(true);
    const res = await fetch("/api/progress-reports/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classId, sectionId, academicYearId, term, perStudent: edits }) });
    setBusy(false);
    if (!res.ok) return toast.error("Generate failed");
    const j = await res.json();
    toast.success(`Generated ${j.count} report cards (DRAFT)`);
    setPreview(null); setEdits({}); onGenerated();
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1"><Label className="text-xs">Class</Label><Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId(""); }}><SelectTrigger><SelectValue placeholder="Class" /></SelectTrigger><SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label className="text-xs">Section</Label><Select value={sectionId} onValueChange={setSectionId} disabled={!classId}><SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger><SelectContent>{sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label className="text-xs">Academic year</Label><Select value={academicYearId} onValueChange={setAcademicYearId}><SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger><SelectContent>{years.map((y) => <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1"><Label className="text-xs">Term</Label><Select value={term} onValueChange={setTerm}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{TERMS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <Button onClick={loadPreview} disabled={!classId || !sectionId}>Generate preview</Button>

      {preview && (
        <>
          <p className="text-sm text-muted-foreground">{preview.length} students. Review aggregated data and add remarks, then generate.</p>
          <div className="space-y-2">
            {preview.map((s) => (
              <Card key={s.studentId}><CardContent className="space-y-2 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{s.studentName} <span className="text-xs text-muted-foreground">#{s.admissionNumber}</span></p>
                  <div className="flex items-center gap-3 text-sm">
                    <span>Overall {s.overallPercent}% <span className={`rounded px-2 py-0.5 text-xs font-semibold ${gradeColorClass(s.overallGrade)}`}>{s.overallGrade}</span></span>
                    <span className="text-muted-foreground">Att {s.attendancePercent}%</span>
                    <span className="text-muted-foreground">Rank {s.rank}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{s.subjects.map((sub) => `${sub.subjectName}: ${sub.average}% (${sub.grade})`).join("  ·  ") || "No test scores"}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Input placeholder="Remarks" value={edits[s.studentId]?.remarks ?? ""} onChange={(e) => setEdit(s.studentId, "remarks", e.target.value)} />
                  <Input placeholder="Co-curricular" value={edits[s.studentId]?.coCurricular ?? ""} onChange={(e) => setEdit(s.studentId, "coCurricular", e.target.value)} />
                  <Select value={edits[s.studentId]?.conduct ?? ""} onValueChange={(v) => setEdit(s.studentId, "conduct", v)}><SelectTrigger><SelectValue placeholder="Conduct" /></SelectTrigger><SelectContent>{["A", "B", "C", "D"].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select>
                </div>
              </CardContent></Card>
            ))}
          </div>
          <Button onClick={generate} disabled={busy}>{busy ? "Generating…" : "Generate Reports"}</Button>
        </>
      )}
    </div>
  );
}
