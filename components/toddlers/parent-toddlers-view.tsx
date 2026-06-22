// PARENT read-only view of their own toddler(s). Shows the profile details the
// school keeps on file. No editing — parents can't change the roster.
"use client";

import { useEffect, useState } from "react";
import { Baby, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ageFromDob } from "@/lib/toddler-age";
import type { Toddler } from "@/components/toddlers/toddler-form";

export function ParentToddlersView() {
  const [toddlers, setToddlers] = useState<Toddler[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/parent/toddlers")
      .then((r) => r.json())
      .then((j) => setToddlers(j.toddlers ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (toddlers.length === 0)
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
          <Baby className="h-8 w-8" />
          <p className="text-sm">No toddler profile is linked to your account yet.</p>
        </CardContent>
      </Card>
    );

  return (
    <div className="space-y-3">
      {toddlers.map((t) => (
        <Card key={t.id}>
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {t.photo ? (
                <img src={t.photo} alt={t.name} className="h-14 w-14 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Baby className="h-7 w-7 text-muted-foreground" />
                </span>
              )}
              <div>
                <p className="text-lg font-semibold">{t.name}</p>
                <p className="text-sm text-muted-foreground">{ageFromDob(t.dateOfBirth) ?? "Age —"}</p>
              </div>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <Detail label="Guardian" value={t.guardianName} />
              <Detail label="Guardian phone" value={t.guardianPhone} />
              <Detail
                label="Allergies"
                value={t.allergies}
                highlight={!!t.allergies}
              />
              <Detail label="Medical notes" value={t.medicalNotes} />
            </dl>
            {t.notes && <p className="text-sm text-muted-foreground">{t.notes}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function Detail({ label, value, highlight }: { label: string; value: string | null; highlight?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={highlight ? "flex items-center gap-1 font-medium text-amber-600" : "font-medium"}>
        {highlight && <AlertTriangle className="h-3.5 w-3.5" />}
        {value || "—"}
      </dd>
    </div>
  );
}
