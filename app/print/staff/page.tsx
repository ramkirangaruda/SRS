// Printable staff directory (A4 portrait). PRINCIPAL only. Browser print → PDF.
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ROLES } from "@/lib/roles";
import { prisma } from "@/lib/prisma";
import { listStaff } from "@/lib/staff";
import { PrintTrigger } from "@/components/fees/print-trigger";

export default async function StaffPrintPage() {
  const session = await getServerSession(authOptions);
  if (session!.user.role !== ROLES.PRINCIPAL) notFound();
  const schoolId = session!.user.schoolId;
  const [staff, school] = await Promise.all([
    listStaff(schoolId),
    prisma.school.findUnique({ where: { id: schoolId }, select: { name: true } }),
  ]);

  return (
    <div className="min-h-screen bg-gray-100 p-6 print:bg-white print:p-0">
      <style>{`@page { size: A4 portrait; margin: 14mm; }`}</style>
      <div className="mx-auto max-w-3xl bg-white p-6 shadow print:max-w-none print:shadow-none">
        <div className="mb-4 flex items-center justify-between">
          <div><h1 className="text-xl font-bold">Staff Directory</h1><p className="text-sm text-gray-500">{school?.name}</p></div>
          <PrintTrigger />
        </div>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              {["Name", "Designation", "Department", "Email", "Phone", "Status"].map((h) => <th key={h} className="border border-gray-300 bg-gray-100 p-2 text-left">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {staff.map((s) => (
              <tr key={s.id}>
                <td className="border border-gray-300 p-2">{s.name}</td>
                <td className="border border-gray-300 p-2">{s.designation ?? "—"}</td>
                <td className="border border-gray-300 p-2">{s.department ?? "—"}</td>
                <td className="border border-gray-300 p-2">{s.email}</td>
                <td className="border border-gray-300 p-2">{s.phone ?? "—"}</td>
                <td className="border border-gray-300 p-2">{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
