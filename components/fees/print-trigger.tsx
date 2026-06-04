// A tiny client component that (a) gives a Print button and (b) auto-opens the
// browser's print dialog when the receipt page loads. "Print" in the browser
// includes "Save as PDF", which is how the user downloads the receipt — no PDF
// library needed.
"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PrintTrigger() {
  // Auto-trigger once on mount. A short delay lets fonts/layout settle first.
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <Button onClick={() => window.print()} className="gap-2 print:hidden">
      <Printer className="h-4 w-4" /> Print / Save PDF
    </Button>
  );
}
