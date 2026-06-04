// DataTable columns for the principal fee table (desktop). Built by a factory so
// the "Add Payment" cell can call back into FeesView. Money is formatted from
// paise; the pending cell is red when money is owed, green when fully paid.
"use client";

import { type ColumnDef } from "@tanstack/react-table";
import type { StudentFeeRow } from "@/lib/fees";
import { formatINR } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { FeeStatusBadge } from "@/components/fees/fee-status-badge";

export function makeFeeColumns(
  onAddPayment: (row: StudentFeeRow) => void
): ColumnDef<StudentFeeRow>[] {
  return [
    {
      accessorKey: "admissionNumber",
      header: "Adm. No.",
      cell: ({ row }) => <span className="font-medium">{row.original.admissionNumber}</span>,
    },
    { accessorKey: "name", header: "Name" },
    {
      id: "class",
      header: "Class & Section",
      cell: ({ row }) =>
        `${row.original.className ?? "—"}${row.original.sectionName ? ` · ${row.original.sectionName}` : ""}`,
    },
    { id: "total", header: "Total", cell: ({ row }) => formatINR(row.original.total) },
    { id: "paid", header: "Paid", cell: ({ row }) => formatINR(row.original.paid) },
    {
      id: "pending",
      header: "Pending",
      cell: ({ row }) => (
        <span className={row.original.pending > 0 ? "font-semibold text-red-700" : "text-green-700"}>
          {formatINR(row.original.pending)}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <FeeStatusBadge status={row.original.status} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          disabled={row.original.pending <= 0}
          onClick={(e) => {
            // Stop the click from also triggering the row's navigation handler.
            e.stopPropagation();
            onAddPayment(row.original);
          }}
        >
          Add Payment
        </Button>
      ),
    },
  ];
}
