// Principal admissions pipeline (/principal/admissions). Wrapped in Suspense
// because AdmissionsView reads search params (?convertFrom).
import { Suspense } from "react";
import { AdmissionsView } from "@/components/admissions/admissions-view";

export default function AdmissionsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admissions</h1>
        <p className="text-muted-foreground">Review applications and enrol students.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <AdmissionsView />
      </Suspense>
    </div>
  );
}
