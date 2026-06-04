// Column definitions for the students DataTable (desktop view). Each column says
// what header to show and how to render a cell from a student row. This is a
// Client Component module because the columns are used by the client DataTable.
"use client";

import { type ColumnDef } from "@tanstack/react-table";
import type { StudentWithRelations } from "@/lib/students";
import { formatDate } from "@/lib/format";

export const studentColumns: ColumnDef<StudentWithRelations>[] = [
  {
    accessorKey: "admissionNumber",
    header: "Adm. No.",
    cell: ({ row }) => <span className="font-medium">{row.original.admissionNumber}</span>,
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    id: "class",
    header: "Class",
    cell: ({ row }) => row.original.class?.name ?? "—",
  },
  {
    id: "section",
    header: "Section",
    cell: ({ row }) => row.original.section?.name ?? "—",
  },
  {
    id: "parentName",
    header: "Parent",
    cell: ({ row }) => row.original.parent?.name ?? "—",
  },
  {
    id: "parentPhone",
    header: "Parent Phone",
    cell: ({ row }) => row.original.parent?.phone ?? "—",
  },
  {
    id: "dob",
    header: "Date of Birth",
    cell: ({ row }) => formatDate(row.original.dateOfBirth),
  },
];
