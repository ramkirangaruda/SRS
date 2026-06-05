// Parent test-report detail: subject accordion (native <details>) + trend chart +
// overall stats. Ownership enforced server-side.
import { notFound } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentScores, getStudentChart } from "@/lib/test-reports";
import { gradeColorClass } from "@/lib/grades";
import { formatDate } from "@/lib/format";
import { ScoreTrendChart } from "@/components/test-reports/score-trend-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function Page({ params }: { params: { studentId: string } }) {
  const session = await getServerSession(authOptions);
  const student = await prisma.student.findFirst({ where: { id: params.studentId, parentId: session!.user.id, schoolId: session!.user.schoolId }, select: { id: true, name: true } });
  if (!student) notFound();

  const [scores, chart] = await Promise.all([getStudentScores(student.id, session!.user.schoolId), getStudentChart(student.id, session!.user.schoolId)]);

  // Group scores by subject; compute overall stats.
  const bySubject = new Map<string, typeof scores>();
  for (const s of scores) { const a = bySubject.get(s.subjectName) ?? []; a.push(s); bySubject.set(s.subjectName, a); }
  const subjAvgs = Array.from(bySubject.entries()).map(([name, arr]) => ({ name, avg: arr.reduce((p, q) => p + q.percentage, 0) / arr.length }));
  const overall = subjAvgs.length ? Math.round((subjAvgs.reduce((p, q) => p + q.avg, 0) / subjAvgs.length) * 10) / 10 : 0;
  const best = subjAvgs.slice().sort((a, b) => b.avg - a.avg)[0];
  const weak = subjAvgs.slice().sort((a, b) => a.avg - b.avg)[0];

  return (
    <div className="space-y-4">
      <Link href="/parent/test-reports" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
      <h1 className="text-2xl font-bold">{student.name}</h1>

      {subjAvgs.length > 0 && (
        <Card><CardContent className="grid grid-cols-3 gap-3 p-4 text-center">
          <div><p className="text-xs text-muted-foreground">Overall avg</p><p className="text-xl font-bold">{overall}%</p></div>
          <div><p className="text-xs text-muted-foreground">Best subject</p><p className="font-semibold text-green-700">{best?.name ?? "—"}</p></div>
          <div><p className="text-xs text-muted-foreground">Needs work</p><p className="font-semibold text-amber-700">{weak?.name ?? "—"}</p></div>
        </CardContent></Card>
      )}

      <Card><CardHeader><CardTitle className="text-lg">Score Trend</CardTitle></CardHeader><CardContent><ScoreTrendChart series={chart} /></CardContent></Card>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">By Subject</h2>
        {Array.from(bySubject.entries()).map(([name, arr]) => (
          <details key={name} className="rounded-md border">
            <summary className="cursor-pointer px-4 py-2 font-medium">{name} <span className="text-xs text-muted-foreground">({arr.length} tests)</span></summary>
            <div className="border-t">
              {arr.map((s) => (
                <div key={s.id} className="flex items-center justify-between border-b px-4 py-2 text-sm last:border-0">
                  <span>{s.testName} <span className="text-xs text-muted-foreground">{formatDate(s.date)}</span></span>
                  <span className="flex items-center gap-2">{s.obtainedMarks}/{s.totalMarks} <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${gradeColorClass(s.grade)}`}>{s.grade}</span></span>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}
