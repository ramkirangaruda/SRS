// The report-card HTML template — ONE source of truth used for: (a) the in-app
// "View" (parent + principal), and (b) the print page the browser turns into a
// PDF. WHY HTML (not a coordinate-drawn PDF): we lay it out with normal tables/
// flex/CSS, it's responsive on mobile, selectable, and the SAME markup that
// renders on screen prints to an A4 PDF. (For true server-stored PDFs you'd run
// this HTML through Puppeteer's page.pdf() — a drop-in on top of this template.)
import { gradeColorClass } from "@/lib/grades";
import { formatDate } from "@/lib/format";

type Test = { testName: string; obtained: number; total: number };
type Subject = { subjectName: string; tests: Test[]; average: number; grade: string };
type Snapshot = { subjects: Subject[]; attendancePercent: number; overallPercent: number; overallGrade: string; rank: number };
type Report = {
  term: string; remarks: string | null; coCurricular: string | null; conduct: string | null;
  overallGrade: string | null; overallPercent: number | null; attendancePercent: number | null; rank: number | null;
  student: { name: string; admissionNumber: string; className: string | null; sectionName: string | null };
  school: { name: string; logo: string | null; address: string | null };
  academicYearName: string;
  snapshot: Snapshot | null;
};

export function ReportCard({ report, showRank }: { report: Report; showRank: boolean }) {
  const snap = report.snapshot;
  const testNames: string[] = [];
  for (const s of snap?.subjects ?? []) for (const t of s.tests) if (!testNames.includes(t.testName)) testNames.push(t.testName);

  return (
    // A4-ish portrait card. mx-auto + max width on screen; full bleed on print.
    <div className="mx-auto max-w-[800px] bg-white p-8 text-black print:max-w-none print:p-0">
      {/* Header */}
      <div className="flex items-center gap-4 border-b-2 border-black pb-3">
        {report.school.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={report.school.logo} alt="" className="h-14 w-14 object-contain" />
        ) : <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-200 text-xs">LOGO</div>}
        <div className="text-center" style={{ flex: 1 }}>
          <h1 className="text-xl font-bold">{report.school.name}</h1>
          {report.school.address && <p className="text-xs text-gray-600">{report.school.address}</p>}
          <p className="mt-1 text-sm font-semibold">Report Card — {report.term} · {report.academicYearName}</p>
        </div>
      </div>

      {/* Student info */}
      <div className="mt-3 grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
        <Info label="Name" value={report.student.name} />
        <Info label="Admission No." value={report.student.admissionNumber} />
        <Info label="Class" value={`${report.student.className ?? "—"}${report.student.sectionName ? ` - ${report.student.sectionName}` : ""}`} />
        <Info label="Attendance" value={`${report.attendancePercent ?? snap?.attendancePercent ?? 0}%`} />
      </div>

      {/* Subjects table */}
      <table className="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-400 p-1 text-left">Subject</th>
            {testNames.map((t) => <th key={t} className="border border-gray-400 p-1 text-center">{t}</th>)}
            <th className="border border-gray-400 p-1 text-center">Average</th>
            <th className="border border-gray-400 p-1 text-center">Grade</th>
          </tr>
        </thead>
        <tbody>
          {(snap?.subjects ?? []).map((s) => (
            <tr key={s.subjectName}>
              <td className="border border-gray-400 p-1">{s.subjectName}</td>
              {testNames.map((tn) => { const t = s.tests.find((x) => x.testName === tn); return <td key={tn} className="border border-gray-400 p-1 text-center">{t ? `${t.obtained}/${t.total}` : "—"}</td>; })}
              <td className="border border-gray-400 p-1 text-center font-medium">{s.average}%</td>
              <td className="border border-gray-400 p-1 text-center">{s.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Overall */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded border border-gray-300 p-3 text-sm">
        <span>Overall: <span className="font-bold">{report.overallPercent ?? snap?.overallPercent ?? 0}%</span> <span className={`ml-1 rounded px-2 py-0.5 text-xs font-semibold ${gradeColorClass(report.overallGrade ?? "F")}`}>{report.overallGrade}</span></span>
        {showRank && <span>Class Rank: <span className="font-bold">{report.rank ?? snap?.rank ?? "—"}</span></span>}
        {report.conduct && <span>Conduct: <span className="font-bold">{report.conduct}</span></span>}
      </div>

      {/* Remarks */}
      {report.coCurricular && <Block title="Co-curricular Activities" body={report.coCurricular} />}
      {report.remarks && <Block title="Teacher's Remarks" body={report.remarks} />}

      {/* Signatures */}
      <div className="mt-10 flex justify-between text-xs">
        <div className="text-center"><div className="mb-1 border-t border-black px-8 pt-1">Class Teacher</div></div>
        <div className="text-center"><div className="mb-1 border-t border-black px-8 pt-1">Principal</div></div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><span className="text-gray-600">{label}: </span><span className="font-medium">{value}</span></div>;
}
function Block({ title, body }: { title: string; body: string }) {
  return <div className="mt-3 text-sm"><p className="font-semibold">{title}</p><p className="whitespace-pre-wrap text-gray-700">{body}</p></div>;
}

export { formatDate };
