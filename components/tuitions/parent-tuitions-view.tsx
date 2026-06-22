// PARENT read-only view of their children's tuition enrollments + fee status.
"use client";

import { useEffect, useState } from "react";
import { GraduationCap } from "lucide-react";
import { formatINR } from "@/lib/money";
import { feeStatusVariant, type FeeStatus } from "@/lib/fee-status";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Row = {
  studentId: string; studentName: string; batchId: string; batchName: string;
  subject: string | null; schedule: string | null; feeAmount: number; paid: number; balance: number; status: FeeStatus;
};

export function ParentTuitionsView() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/parent/tuitions")
      .then((r) => r.json())
      .then((j) => setRows(j.tuitions ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (rows.length === 0)
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
          <GraduationCap className="h-8 w-8" />
          <p className="text-sm">Your child isn't enrolled in any tuition batches.</p>
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <Card key={`${r.studentId}-${r.batchId}`}>
          <CardContent className="flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium leading-tight">{r.batchName}</p>
              <p className="truncate text-xs text-muted-foreground">
                {r.studentName}{r.subject ? ` · ${r.subject}` : ""}{r.schedule ? ` · ${r.schedule}` : ""}
              </p>
            </div>
            <div className="text-right text-xs">
              <p className="text-muted-foreground">Fee {formatINR(r.feeAmount)}</p>
              <p>Paid {formatINR(r.paid)} · Balance <strong>{formatINR(r.balance)}</strong></p>
            </div>
            <Badge variant={feeStatusVariant(r.status)}>{r.status}</Badge>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
