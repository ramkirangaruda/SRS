// CSV export of visitors in a date range. PRINCIPAL. (PDF is handled by a print
// page; CSV is generated here as a downloadable attachment.)
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { exportVisitors } from "@/lib/visitors";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PRINCIPAL);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const rows = await exportVisitors(auth.schoolId, searchParams.get("from") ?? undefined, searchParams.get("to") ?? undefined);
  const header = ["Name", "Phone", "Purpose", "Visiting", "Check-in", "Check-out", "ID Proof", "Notes"];
  const csvRows = rows.map((r) => [r.name, r.phone, r.purpose, r.visitingWhomName ?? "", r.checkInTime, r.checkOutTime ?? "Still here", r.idProofType ?? "", r.notes ?? ""]);
  const csv = [header, ...csvRows].map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="visitors-${new Date().toISOString().slice(0, 10)}.csv"` },
  });
}
