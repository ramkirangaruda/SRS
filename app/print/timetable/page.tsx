// Printable timetable (A4 landscape). Two modes via query params:
//   ?classId=&sectionId=&academicYearId=  → a class/section grid
//   ?teacherId=&academicYearId=           → a teacher's personal grid
// Server-rendered as a plain HTML table (NOT the client TimetableGrid, since a
// render-prop function can't cross the server→client boundary). The browser's
// print dialog ("Save as PDF") produces the downloadable file.
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { getTimetable, getTeacherTimetable, cellKey, DAYS, DAY_LABELS } from "@/lib/timetable";
import { subjectColor } from "@/lib/colors";
import { PrintTrigger } from "@/components/fees/print-trigger";

export default async function TimetablePrintPage({ searchParams }: { searchParams: { classId?: string; sectionId?: string; teacherId?: string; academicYearId?: string } }) {
  const session = await getServerSession(authOptions);
  const schoolId = session!.user.schoolId;
  const isParent = session!.user.role === ROLES.PARENT;
  if (isParent) notFound(); // parents print from their own view; this is staff-facing
  const yearId = searchParams.academicYearId;
  if (!yearId) notFound();

  const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } });

  // Build a uniform { title, subtitle, periods, cellText(day, period) } shape.
  let title = "";
  let subtitle = "";
  let periods: { id: string; periodNumber: number; label: string; startTime: string; endTime: string; type: string }[] = [];
  let cell: (day: string, periodNumber: number) => { subject: string | null; sub: string } | null;

  if (searchParams.teacherId) {
    const teacher = await prisma.user.findFirst({ where: { id: searchParams.teacherId, schoolId }, select: { name: true } });
    if (!teacher) notFound();
    const tt = await getTeacherTimetable(searchParams.teacherId, schoolId, yearId);
    periods = tt.periods;
    title = teacher.name;
    subtitle = "Teacher timetable";
    cell = (day, pn) => { const c = tt.byCell[cellKey(day, pn)]; return c ? { subject: c.subjectName, sub: `${c.className}-${c.sectionName}` } : null; };
  } else if (searchParams.classId && searchParams.sectionId) {
    const klass = await prisma.class.findFirst({ where: { id: searchParams.classId, schoolId }, select: { name: true } });
    const section = await prisma.section.findFirst({ where: { id: searchParams.sectionId }, select: { name: true } });
    if (!klass) notFound();
    const tt = await getTimetable(schoolId, searchParams.classId, searchParams.sectionId, yearId);
    periods = tt.periods;
    title = `Class ${klass.name}${section ? ` - ${section.name}` : ""}`;
    subtitle = "Class timetable";
    cell = (day, pn) => { const c = tt.byCell[cellKey(day, pn)]; return c ? { subject: c.subjectName, sub: c.teacherName ?? "" } : null; };
  } else {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:bg-white print:p-0">
      <style>{`@page { size: A4 landscape; margin: 12mm; }`}</style>
      <div className="mx-auto max-w-[1100px] bg-white p-6 shadow print:max-w-none print:shadow-none">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{title}</h1>
            <p className="text-sm text-gray-500">{subtitle} · {school?.name}</p>
          </div>
          <PrintTrigger />
        </div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border border-gray-300 bg-gray-100 p-2 text-left">Period</th>
              {DAYS.map((d) => <th key={d} className="border border-gray-300 bg-gray-100 p-2 text-center">{DAY_LABELS[d]}</th>)}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => p.type !== "CLASS" ? (
              <tr key={p.id}>
                <td className="border border-gray-300 bg-gray-50 p-2"><div className="font-medium">{p.label}</div><div className="text-[10px] text-gray-500">{p.startTime}–{p.endTime}</div></td>
                <td colSpan={DAYS.length} className="border border-gray-300 bg-amber-50 p-2 text-center font-medium uppercase text-amber-700">{p.label}</td>
              </tr>
            ) : (
              <tr key={p.id}>
                <td className="border border-gray-300 bg-gray-50 p-2"><div className="font-medium">{p.label}</div><div className="text-[10px] text-gray-500">{p.startTime}–{p.endTime}</div></td>
                {DAYS.map((d) => {
                  const c = cell(d, p.periodNumber);
                  const color = subjectColor(c?.subject);
                  return (
                    <td key={d} className={`border border-gray-300 p-2 align-top ${c ? color.bg : ""}`}>
                      {c ? <><div className="font-semibold">{c.subject ?? "—"}</div><div className="text-[10px] text-gray-600">{c.sub}</div></> : <span className="text-gray-300">—</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
