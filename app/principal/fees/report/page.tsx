// Class-wise fee report (/principal/fees/report). A Server Component that uses
// the aggregated getClassReport() data to show, per class: students, expected,
// collected, pending, and collection %. Helps spot classes with the most
// defaulters. Responsive: table on desktop, cards on mobile.
import Link from "next/link";
import { getServerSession } from "next-auth";
import { ArrowLeft } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getClassReport } from "@/lib/fees";
import { formatINR } from "@/lib/money";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function FeeReportPage() {
  const session = await getServerSession(authOptions);
  const rows = await getClassReport(session!.user.schoolId);

  // Totals row computed by summing the per-class aggregates.
  const totals = rows.reduce(
    (acc, r) => ({
      students: acc.students + r.students,
      expected: acc.expected + r.expected,
      collected: acc.collected + r.collected,
      pending: acc.pending + r.pending,
    }),
    { students: 0, expected: 0, collected: 0, pending: 0 }
  );
  const totalPct = totals.expected > 0 ? Math.round((totals.collected / totals.expected) * 100) : 0;

  return (
    <div className="space-y-4">
      <Link
        href="/principal/fees"
        className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to fees
      </Link>

      <h1 className="text-2xl font-bold">Class-wise Fee Report</h1>

      {/* DESKTOP table */}
      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Class</TableHead>
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="text-right">Expected</TableHead>
              <TableHead className="text-right">Collected</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.classId}>
                <TableCell className="font-medium">{r.className}</TableCell>
                <TableCell className="text-right">{r.students}</TableCell>
                <TableCell className="text-right">{formatINR(r.expected)}</TableCell>
                <TableCell className="text-right text-green-700">{formatINR(r.collected)}</TableCell>
                <TableCell className={`text-right ${r.pending > 0 ? "text-red-700" : "text-green-700"}`}>
                  {formatINR(r.pending)}
                </TableCell>
                <TableCell className="text-right">{r.percentage}%</TableCell>
              </TableRow>
            ))}
            {/* Totals row */}
            <TableRow className="bg-muted/50 font-semibold">
              <TableCell>Total</TableCell>
              <TableCell className="text-right">{totals.students}</TableCell>
              <TableCell className="text-right">{formatINR(totals.expected)}</TableCell>
              <TableCell className="text-right text-green-700">{formatINR(totals.collected)}</TableCell>
              <TableCell className={`text-right ${totals.pending > 0 ? "text-red-700" : "text-green-700"}`}>
                {formatINR(totals.pending)}
              </TableCell>
              <TableCell className="text-right">{totalPct}%</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      {/* MOBILE cards */}
      <div className="space-y-2 md:hidden">
        {rows.map((r) => (
          <Card key={r.classId}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Class {r.className}</span>
                <span className="text-sm text-muted-foreground">{r.students} students · {r.percentage}%</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Expected</p>
                  <p>{formatINR(r.expected)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Collected</p>
                  <p className="text-green-700">{formatINR(r.collected)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className={r.pending > 0 ? "text-red-700" : "text-green-700"}>{formatINR(r.pending)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
