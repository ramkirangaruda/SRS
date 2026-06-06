// Printable daycare history (A4) for a student + date range. PRINCIPAL/TEACHER.
// Browser print → PDF. Used for parent-teacher meetings.
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { dateUTCFromKey, dayKey, formatKey } from "@/lib/calendar";
import { MOOD_META } from "@/lib/daycare-constants";
import { PrintTrigger } from "@/components/fees/print-trigger";

const time = (d: Date | null) => (d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");

export default async function DaycarePrintPage({ params, searchParams }: { params: { studentId: string }; searchParams: { from?: string; to?: string } }) {
  const session = await getServerSession(authOptions);
  if (session!.user.role === ROLES.PARENT) notFound();
  const schoolId = session!.user.schoolId;
  const from = searchParams.from, to = searchParams.to;
  if (!from || !to) notFound();

  const [student, school, logs] = await Promise.all([
    prisma.student.findFirst({ where: { id: params.studentId, schoolId }, select: { name: true, class: { select: { name: true } } } }),
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
    prisma.daycareLog.findMany({
      where: { studentId: params.studentId, schoolId, date: { gte: dateUTCFromKey(from), lte: dateUTCFromKey(to) } },
      include: { activities: true, meals: true, naps: true },
      orderBy: { date: "asc" },
    }),
  ]);
  if (!student) notFound();

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:bg-white print:p-0">
      <style>{`@page { size: A4 portrait; margin: 14mm; }`}</style>
      <div className="mx-auto max-w-3xl bg-white p-6 shadow print:max-w-none print:shadow-none">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{student.name} — Daycare Report</h1>
            <p className="text-sm text-gray-500">{student.class?.name ?? ""} · {formatKey(from)} to {formatKey(to)} · {school?.name}</p>
          </div>
          <PrintTrigger />
        </div>
        {logs.length === 0 ? <p className="text-sm text-gray-500">No records in this range.</p> : (
          <div className="space-y-4">
            {logs.map((l) => (
              <div key={l.id} className="break-inside-avoid border-b pb-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{formatKey(dayKey(l.date))}</p>
                  <p className="text-sm">{time(l.checkInTime)} – {time(l.checkOutTime)} {l.mood && <span className="ml-2">{MOOD_META[l.mood]?.emoji} {MOOD_META[l.mood]?.label}</span>}</p>
                </div>
                {l.activities.length > 0 && <p className="text-sm text-gray-700">Activities: {l.activities.map((a) => `${a.time ?? ""} ${a.activityName || a.activityType}`.trim()).join(", ")}</p>}
                {l.meals.length > 0 && <p className="text-sm text-gray-700">Meals: {l.meals.map((m) => `${m.mealType.replace(/_/g, " ")} (${m.eaten ? "ate" : "no"})`).join(", ")}</p>}
                {l.naps.length > 0 && <p className="text-sm text-gray-700">Nap: {l.naps.map((n) => `${n.startTime ?? "?"}–${n.endTime ?? "?"} ${n.quality?.replace(/_/g, " ") ?? ""}`).join(", ")}</p>}
                {l.generalNotes && <p className="text-sm text-gray-700">Notes: {l.generalNotes}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
