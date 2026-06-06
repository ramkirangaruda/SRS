// Principal staff directory: stats cards + filters + DataTable. Add-staff opens
// the form; clicking a row goes to the detail page. CSV export builds the file
// client-side from the loaded rows; "Print" opens the A4 print page.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type ColumnDef } from "@tanstack/react-table";
import { Plus, Download, Printer, Search } from "lucide-react";
import type { StaffRow } from "@/lib/staff";
import { STAFF_STATUSES, DESIGNATIONS } from "@/lib/staff";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StaffForm } from "@/components/staff/staff-form";

type Stats = { total: number; active: number; onLeave: number; resigned: number; teachers: number; monthlyPayroll: number };

const statusVariant = (s: string) => (s === "ACTIVE" ? "success" : s === "ON_LEAVE" ? "secondary" : "destructive");

export function StaffDirectory({ initialStaff, initialStats }: { initialStaff: StaffRow[]; initialStats: Stats }) {
  const router = useRouter();
  const [staff, setStaff] = useState(initialStaff);
  const [stats, setStats] = useState(initialStats);
  const [search, setSearch] = useState("");
  const [designation, setDesignation] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [formOpen, setFormOpen] = useState(false);

  const reload = useCallback(async () => {
    const qs = new URLSearchParams();
    if (search) qs.set("search", search);
    if (designation !== "ALL") qs.set("designation", designation);
    if (status !== "ALL") qs.set("status", status);
    const [s, st] = await Promise.all([
      fetch(`/api/staff?${qs}`).then((r) => r.json()),
      fetch(`/api/staff/stats`).then((r) => r.json()),
    ]);
    setStaff(s.staff ?? []);
    setStats(st);
  }, [search, designation, status]);

  // Debounce filter changes into a single reload.
  useEffect(() => {
    const t = setTimeout(reload, 300);
    return () => clearTimeout(t);
  }, [reload]);

  const columns = useMemo<ColumnDef<StaffRow>[]>(() => [
    { accessorKey: "name", header: "Name", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
    { accessorKey: "designation", header: "Designation", cell: ({ row }) => row.original.designation ?? "—" },
    { accessorKey: "department", header: "Department", cell: ({ row }) => row.original.department ?? "—" },
    { accessorKey: "email", header: "Contact", cell: ({ row }) => <div className="text-xs"><div>{row.original.email}</div><div className="text-muted-foreground">{row.original.phone ?? ""}</div></div> },
    { accessorKey: "status", header: "Status", cell: ({ row }) => <Badge variant={statusVariant(row.original.status)}>{row.original.status}</Badge> },
  ], []);

  function exportCsv() {
    const header = ["Name", "Email", "Phone", "Designation", "Department", "Employee ID", "Status"];
    const rows = staff.map((s) => [s.name, s.email, s.phone ?? "", s.designation ?? "", s.department ?? "", s.employeeId ?? "", s.status]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `staff-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total staff" value={stats.total} />
        <StatCard label="Active" value={stats.active} />
        <StatCard label="On leave" value={stats.onLeave} />
        <StatCard label="Teachers" value={stats.teachers} />
        <StatCard label="Payroll/mo" value={`₹${stats.monthlyPayroll.toLocaleString("en-IN")}`} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={designation} onValueChange={setDesignation}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All roles</SelectItem>{DESIGNATIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select>
        <Select value={status} onValueChange={setStatus}><SelectTrigger className="w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">All statuses</SelectItem>{STAFF_STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" size="sm" onClick={exportCsv}><Download className="mr-1 h-4 w-4" /> CSV</Button>
        <Button variant="outline" size="sm" asChild><a href="/print/staff" target="_blank"><Printer className="mr-1 h-4 w-4" /> Print</a></Button>
        <Button size="sm" onClick={() => setFormOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add staff</Button>
      </div>

      <DataTable columns={columns} data={staff} onRowClick={(row) => router.push(`/principal/staff/${row.id}`)} />

      <StaffForm open={formOpen} onOpenChange={setFormOpen} onSaved={reload} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></CardContent></Card>;
}
