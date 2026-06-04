// The principal fee dashboard (client). Holds the table rows AND the summary in
// state so an "Add Payment" can update them INSTANTLY (optimistic UI) without a
// full page reload. Search/class/status filters live in the URL (server re-runs
// the query). After a successful payment we reconcile the row with the server's
// authoritative numbers; on failure we roll the optimistic change back.
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import type { FeeSummary, StudentFeeRow } from "@/lib/fees";
import type { PaymentCreateInput } from "@/lib/validations/fee";
import { statusFor } from "@/lib/fee-status";
import { formatINR, percent, toMinor } from "@/lib/money";
import { SummaryCards } from "@/components/fees/summary-cards";
import { makeFeeColumns } from "@/components/fees/fee-columns";
import { AddPaymentSheet } from "@/components/fees/add-payment-sheet";
import { DataTable } from "@/components/ui/data-table";
import { FeeStatusBadge } from "@/components/fees/fee-status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ClassOption = { id: string; name: string };

type Props = {
  summary: FeeSummary;
  students: StudentFeeRow[];
  classes: ClassOption[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  filters: { search: string; classId: string; status: string };
};

const ALL = "all";

export function FeesView({ summary, students, classes, total, page, pageSize, totalPages, filters }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local copies we can mutate optimistically.
  const [rows, setRows] = useState(students);
  const [summaryState, setSummaryState] = useState(summary);
  const [searchText, setSearchText] = useState(filters.search);
  const [activeRow, setActiveRow] = useState<StudentFeeRow | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  // Re-sync local state whenever the server sends fresh props (navigation,
  // search, filter, or pagination changed).
  useEffect(() => setRows(students), [students]);
  useEffect(() => setSummaryState(summary), [summary]);

  function updateParams(updates: Record<string, string | null>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "" || v === ALL) params.delete(k);
      else params.set(k, v);
    }
    if (resetPage) params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  // Debounced search → URL.
  useEffect(() => {
    if (searchText === filters.search) return;
    const t = setTimeout(() => updateParams({ search: searchText }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  function openSheet(row: StudentFeeRow) {
    setActiveRow(row);
    setSheetOpen(true);
  }

  // The optimistic payment handler passed to the sheet.
  async function handleSubmitPayment(values: PaymentCreateInput): Promise<{ ok: boolean; error?: string }> {
    const target = activeRow;
    if (!target) return { ok: false, error: "No student selected" };
    const amountMinor = toMinor(values.amount);

    // Snapshot for rollback.
    const prevRows = rows;
    const prevSummary = summaryState;

    // 1) OPTIMISTIC: update the row + summary immediately.
    setRows((rs) =>
      rs.map((r) => {
        if (r.id !== target.id) return r;
        const paid = r.paid + amountMinor;
        return { ...r, paid, pending: Math.max(0, r.total - paid), status: statusFor(r.total, paid) };
      })
    );
    setSummaryState((s) => {
      const collected = s.collected + amountMinor;
      return {
        ...s,
        collected,
        pending: Math.max(0, s.expected - collected),
        percentage: percent(collected, s.expected),
      };
    });

    // 2) Send to the server.
    const res = await fetch("/api/fees/payment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      // 3a) ROLLBACK on failure.
      setRows(prevRows);
      setSummaryState(prevSummary);
      const json = await res.json().catch(() => ({}));
      return { ok: false, error: json.error ?? "Failed to record payment." };
    }

    // 3b) RECONCILE the row with the server's authoritative totals.
    const result = await res.json();
    setRows((rs) =>
      rs.map((r) =>
        r.id === target.id
          ? { ...r, paid: result.paid, pending: result.pending, status: result.status }
          : r
      )
    );
    return { ok: true };
  }

  const columns = makeFeeColumns(openSheet);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Fees</h1>
          <p className="text-sm text-muted-foreground">{total} students</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => router.push("/principal/fees/report")}>
          Class-wise report
        </Button>
      </div>

      <SummaryCards summary={summaryState} />

      {/* Search + filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name or admission number…"
            className="pl-9"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Select value={filters.classId || ALL} onValueChange={(v) => updateParams({ classId: v })}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Class" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.status || ALL} onValueChange={(v) => updateParams({ status: v })}>
          <SelectTrigger className="sm:w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            <SelectItem value="PAID">Paid</SelectItem>
            <SelectItem value="PARTIAL">Partial</SelectItem>
            <SelectItem value="UNPAID">Unpaid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* DESKTOP table */}
      <div className="hidden md:block">
        <DataTable
          columns={columns}
          data={rows}
          onRowClick={(r) => router.push(`/principal/fees/${r.id}`)}
        />
      </div>

      {/* MOBILE cards */}
      <div className="space-y-2 md:hidden">
        {rows.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No students found.
            </CardContent>
          </Card>
        ) : (
          rows.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div
                  className="cursor-pointer"
                  onClick={() => router.push(`/principal/fees/${r.id}`)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{r.name}</span>
                    <FeeStatusBadge status={r.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {r.admissionNumber} · Class {r.className ?? "—"}
                    {r.sectionName ? ` · ${r.sectionName}` : ""}
                  </p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Total</p>
                      <p>{formatINR(r.total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Paid</p>
                      <p>{formatINR(r.paid)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Pending</p>
                      <p className={r.pending > 0 ? "font-semibold text-red-700" : "text-green-700"}>
                        {formatINR(r.pending)}
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3 w-full"
                  disabled={r.pending <= 0}
                  onClick={() => openSheet(r)}
                >
                  Add Payment
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) }, false)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateParams({ page: String(page + 1) }, false)}>
            Next
          </Button>
        </div>
      </div>

      <AddPaymentSheet row={activeRow} open={sheetOpen} onOpenChange={setSheetOpen} onSubmit={handleSubmitPayment} />
    </div>
  );
}
