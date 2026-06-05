// Submissions list + quick grading for an assignment. Shows a progress bar
// (x of y submitted), a Close button (no more submissions after closing), and a
// per-student row with file download + grade/feedback inputs. "Save grades"
// PATCHes each changed submission.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, Lock } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

type Sub = { studentId: string; studentName: string; submission: { id: string; fileUrl: string | null; submittedAt: string; grade: string | null; feedback: string | null } | null };

export function AssignmentGrading({ assignmentId, status, totalMarks }: { assignmentId: string; status: string; totalMarks: number | null }) {
  const router = useRouter();
  const [rows, setRows] = useState<Sub[]>([]);
  const [edits, setEdits] = useState<Record<string, { grade: string; feedback: string }>>({});
  const [busy, setBusy] = useState(false);

  function load() {
    fetch(`/api/elearning/assignments/${assignmentId}/submissions`).then((r) => r.json()).then((j) => {
      setRows(j.data ?? []);
      const e: Record<string, { grade: string; feedback: string }> = {};
      for (const r of j.data ?? []) if (r.submission) e[r.submission.id] = { grade: r.submission.grade ?? "", feedback: r.submission.feedback ?? "" };
      setEdits(e);
    });
  }
  useEffect(load, [assignmentId]);

  const submitted = rows.filter((r) => r.submission).length;
  const pct = rows.length ? Math.round((submitted / rows.length) * 100) : 0;

  async function saveAll() {
    setBusy(true);
    const toSave = rows.filter((r) => r.submission);
    await Promise.all(toSave.map((r) => fetch(`/api/elearning/assignments/${assignmentId}/submissions/${r.submission!.id}/grade`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(edits[r.submission!.id]) })));
    setBusy(false); toast.success("Grades saved");
  }

  async function toggleClose() {
    const res = await fetch(`/api/elearning/assignments/${assignmentId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: status === "OPEN" ? "CLOSED" : "OPEN" }) });
    if (!res.ok) return toast.error("Failed");
    toast.success(status === "OPEN" ? "Assignment closed" : "Reopened"); router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1">
          <p className="text-sm font-medium">{submitted} of {rows.length} students submitted</p>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-1" onClick={toggleClose}><Lock className="h-4 w-4" /> {status === "OPEN" ? "Close" : "Reopen"}</Button>
          <Button size="sm" onClick={saveAll} disabled={busy}>Save grades</Button>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((r) => (
          <Card key={r.studentId}><CardContent className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-32 flex-1">
              <p className="font-medium">{r.studentName}</p>
              {r.submission ? <p className="text-xs text-muted-foreground">Submitted {formatDate(r.submission.submittedAt)}</p> : <p className="text-xs text-amber-600">Not submitted</p>}
            </div>
            {r.submission?.fileUrl && <a href={r.submission.fileUrl} download className="flex items-center gap-1 text-sm text-blue-600 hover:underline"><Download className="h-4 w-4" /> File</a>}
            {r.submission && (
              <div className="flex items-center gap-2">
                <Input className="w-20" placeholder={totalMarks ? `/${totalMarks}` : "Grade"} value={edits[r.submission.id]?.grade ?? ""} onChange={(e) => setEdits((p) => ({ ...p, [r.submission!.id]: { ...p[r.submission!.id], grade: e.target.value } }))} />
                <Input className="w-44" placeholder="Feedback" value={edits[r.submission.id]?.feedback ?? ""} onChange={(e) => setEdits((p) => ({ ...p, [r.submission!.id]: { ...p[r.submission!.id], feedback: e.target.value } }))} />
              </div>
            )}
          </CardContent></Card>
        ))}
      </div>
    </div>
  );
}
