// Bulk holiday import via CSV, parsed IN THE BROWSER.
//
// HOW CSV PARSING WORKS: a CSV is just text — rows separated by newlines, fields
// by commas. The naive parse is `text.split("\n").map(line => line.split(","))`.
// We do a touch more: trim, skip blank lines, skip an optional header row, and
// handle simple double-quoted fields (so a name with a comma works). The browser
// reads the file with the FileReader/`.text()` API; we then POST the clean rows
// to /api/holidays/bulk, which inserts them in one transaction.
"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Row = { name: string; date: string; type: string };

// Split a single CSV line into fields, honoring simple "double quotes".
function splitLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === "," && !inQuotes) { out.push(cur); cur = ""; }
    else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

function parseCsv(text: string): Row[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  // Skip a header row if it looks like one.
  const start = /name/i.test(lines[0]) && /date/i.test(lines[0]) ? 1 : 0;
  const rows: Row[] = [];
  for (let i = start; i < lines.length; i++) {
    const [name, date, type] = splitLine(lines[i]);
    if (name && date) rows.push({ name, date, type: type || "OTHER" });
  }
  return rows;
}

export function CsvImport({ open, onOpenChange, onSaved }: { open: boolean; onOpenChange: (o: boolean) => void; onSaved: () => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const rows = parseCsv(text);

  async function importRows() {
    if (rows.length === 0) { toast.error("No valid rows found"); return; }
    setBusy(true);
    const res = await fetch("/api/holidays/bulk", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows }) });
    setBusy(false);
    if (!res.ok) { const j = await res.json().catch(() => ({})); toast.error(j.error ?? "Import failed"); return; }
    const j = await res.json();
    toast.success(`Imported ${j.count} holidays`);
    setText(""); onSaved(); onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Import Holidays (CSV)</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">One holiday per line: <code className="rounded bg-muted px-1">name,date,type</code> (date as YYYY-MM-DD). A header row is optional.</p>
          <input type="file" accept=".csv,text/csv" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setText(await f.text()); }} className="text-sm" />
          <Textarea
            rows={8}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"name,date,type\nDiwali Break,2026-11-09,FESTIVAL\nRepublic Day,2026-01-26,NATIONAL"}
            className="font-mono text-xs"
          />
          <p className="text-sm">{rows.length} valid row(s) detected.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={importRows} disabled={busy || rows.length === 0} className="gap-1"><Upload className="h-4 w-4" /> Import {rows.length}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
