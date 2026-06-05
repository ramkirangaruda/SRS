// Principal feedback management: clickable summary chips (filter by status),
// filters (status/category/date/search), a list with submitter identity (or
// "Anonymous"), and bulk actions (assign category / close) on selected tickets.
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { FEEDBACK_CATEGORIES } from "@/lib/feedback-categories";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FeedbackStatusBadge } from "@/components/feedback/feedback-status-badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Submitter = { anonymous: true } | { anonymous: false; name: string; childClass: string | null };
type Item = {
  id: string; referenceNumber: string; subject: string; category: string | null;
  status: string; createdAt: string; lastMessage: { role: string; text: string } | null; submitter: Submitter;
};
type Counts = { total: number; pending: number; replied: number; closed: number; reopened: number };

const ALL = "all";

export function PrincipalFeedbackList({
  items, counts, total, page, totalPages, filters,
}: {
  items: Item[];
  counts: Counts;
  total: number;
  page: number;
  totalPages: number;
  filters: { status: string; category: string; search: string };
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [searchText, setSearchText] = useState(filters.search);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");

  function updateParams(updates: Record<string, string | null>, resetPage = true) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(updates)) {
      if (v === null || v === "" || v === ALL) params.delete(k);
      else params.set(k, v);
    }
    if (resetPage) params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  useEffect(() => {
    if (searchText === filters.search) return;
    const t = setTimeout(() => updateParams({ search: searchText }), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Bulk: PATCH each selected ticket, then refresh.
  async function bulkApply(body: Record<string, string>) {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    await Promise.all(
      ids.map((id) => fetch(`/api/feedback/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }))
    );
    toast.success(`Updated ${ids.length} ticket(s)`);
    setSelected(new Set());
    setBulkCategory("");
    router.refresh();
  }

  const chip = (label: string, count: number, status: string, tone: string) => (
    <button
      onClick={() => updateParams({ status })}
      className={`rounded-md border px-3 py-2 text-left ${filters.status === status || (status === "" && !filters.status) ? "border-primary bg-accent" : ""}`}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold ${tone}`}>{count}</p>
    </button>
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Feedback</h1>

      {/* Summary bar — clickable to filter */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {chip("Total", counts.total, "", "text-foreground")}
        {chip("Pending", counts.pending, "PENDING", counts.pending > 0 ? "text-red-600" : "text-foreground")}
        {chip("Reopened", counts.reopened, "REOPENED", counts.reopened > 0 ? "text-orange-600" : "text-foreground")}
        {chip("Replied", counts.replied, "REPLIED", "text-green-700")}
        {chip("Closed", counts.closed, "CLOSED", "text-muted-foreground")}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by reference or subject…" className="pl-9" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
        </div>
        <Select value={filters.category || ALL} onValueChange={(v) => updateParams({ category: v })}>
          <SelectTrigger className="sm:w-44"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All categories</SelectItem>
            {FEEDBACK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar (appears when items are selected) */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-2">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulkApply({ status: "CLOSED" })}>Close</Button>
          <Select value={bulkCategory} onValueChange={(v) => { setBulkCategory(v); bulkApply({ category: v }); }}>
            <SelectTrigger className="h-9 w-44"><SelectValue placeholder="Assign category" /></SelectTrigger>
            <SelectContent>
              {FEEDBACK_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{total} ticket(s)</p>

      {/* List */}
      {items.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No feedback found.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {items.map((f) => (
            <Card key={f.id}>
              <CardContent className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4"
                  checked={selected.has(f.id)}
                  onChange={() => toggle(f.id)}
                  aria-label="select"
                />
                <a href={`/principal/feedback/${f.id}`} className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold">{f.subject}</p>
                      <p className="text-xs text-muted-foreground">{f.referenceNumber}</p>
                    </div>
                    <FeedbackStatusBadge status={f.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    {f.category && <Badge variant="secondary">{f.category}</Badge>}
                    <span>
                      {f.submitter.anonymous
                        ? "Anonymous"
                        : `${f.submitter.name}${f.submitter.childClass ? ` · Class ${f.submitter.childClass}` : ""}`}
                    </span>
                    <span>· {formatDate(f.createdAt)}</span>
                  </div>
                  {f.lastMessage && <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{f.lastMessage.text}</p>}
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => updateParams({ page: String(page - 1) }, false)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => updateParams({ page: String(page + 1) }, false)}>Next</Button>
          </div>
        </div>
      )}
    </div>
  );
}
