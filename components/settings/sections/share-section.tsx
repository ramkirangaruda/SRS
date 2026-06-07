// Share School: app link + invite code + QR + bulk parent invite + adoption stats.
//
// QR CODES encode text (here the app URL) as a grid of black/white modules. The
// data is bit-encoded with error-correction (Reed–Solomon) so a partially dirty
// or obscured code still scans; finder patterns (the three big squares) let a
// camera locate and orient the grid. qrcode.react rasterizes all that for us.
"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { QRCodeCanvas } from "qrcode.react";
import { Copy, RefreshCw, Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Row = { name: string; email: string; phone: string; valid: boolean };

export function ShareSection() {
  const [appUrl, setAppUrl] = useState("");
  const [code, setCode] = useState("");
  const [stats, setStats] = useState<{ totalStudents: number; parentAccounts: number; everLoggedIn: number; activeRecently: number } | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAppUrl(window.location.origin);
    fetch("/api/settings/school-code").then((r) => r.json()).then((j) => setCode(j.code));
    fetch("/api/settings/share-stats").then((r) => r.json()).then(setStats);
  }, []);

  async function regenerate() {
    const res = await fetch("/api/settings/school-code/regenerate", { method: "POST" });
    if (!res.ok) { toast.error("Failed"); return; }
    const j = await res.json(); setCode(j.code); toast.success("New code generated (old one no longer works)");
  }
  function downloadQr() {
    const canvas = qrRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = "school-qr.png"; a.click();
  }

  return (
    <div className="max-w-2xl space-y-6">
      <section className="space-y-2">
        <h3 className="font-semibold">School link</h3>
        <div className="flex gap-2"><Input readOnly value={appUrl} /><Button variant="outline" onClick={() => { navigator.clipboard.writeText(appUrl); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button></div>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Invite code</h3>
        <p className="text-xs text-muted-foreground">Parents enter this code during sign-up to join your school.</p>
        <div className="flex gap-2">
          <Input readOnly value={code} className="font-mono text-lg" />
          <Button variant="outline" onClick={() => { navigator.clipboard.writeText(code); toast.success("Copied"); }}><Copy className="h-4 w-4" /></Button>
          <Button variant="outline" onClick={regenerate}><RefreshCw className="h-4 w-4" /></Button>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">QR code</h3>
        <div ref={qrRef} className="inline-block rounded-md border bg-white p-3">{appUrl && <QRCodeCanvas value={appUrl} size={160} />}</div>
        <div><Button variant="outline" size="sm" onClick={downloadQr}><Download className="mr-1 h-4 w-4" /> Download QR</Button></div>
      </section>

      {stats && (
        <section>
          <h3 className="mb-2 font-semibold">Adoption</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Students" value={stats.totalStudents} />
            <Stat label="Parent accounts" value={stats.parentAccounts} />
            <Stat label="Ever logged in" value={stats.everLoggedIn} />
            <Stat label="Active (7d)" value={stats.activeRecently} />
          </div>
        </section>
      )}

      <BulkInvite onDone={() => fetch("/api/settings/share-stats").then((r) => r.json()).then(setStats)} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return <Card><CardContent className="p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-bold">{value}</p></CardContent></Card>;
}

function BulkInvite({ onDone }: { onDone: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<{ created: number; skipped: number; errors: number; results: { email: string; status: string; tempPassword?: string; reason?: string }[] } | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      // Simple CSV parse: header row name,email,phone then data rows.
      const text = String(reader.result);
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      const start = lines[0]?.toLowerCase().includes("email") ? 1 : 0; // skip header if present
      const parsed: Row[] = lines.slice(start).map((line) => {
        const [name = "", email = "", phone = ""] = line.split(",").map((c) => c.trim());
        const valid = !!name && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
        return { name, email, phone, valid };
      });
      setRows(parsed); setResults(null);
    };
    reader.readAsText(file);
  }

  async function process() {
    const valid = rows.filter((r) => r.valid);
    if (valid.length === 0) return toast.error("No valid rows");
    setBusy(true);
    const res = await fetch("/api/settings/invite-parents", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rows: valid.map((r) => ({ name: r.name, email: r.email, phone: r.phone })) }) });
    setBusy(false);
    if (!res.ok) { toast.error("Failed"); return; }
    const j = await res.json(); setResults(j); toast.success(`Created ${j.created}, skipped ${j.skipped}`); onDone();
  }

  return (
    <section className="space-y-2">
      <h3 className="font-semibold">Bulk invite parents</h3>
      <p className="text-xs text-muted-foreground">Upload a CSV with columns: name, email, phone. Invalid rows are highlighted and skipped.</p>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"><Upload className="h-4 w-4" /> Choose CSV<input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} /></label>

      {rows.length > 0 && !results && (
        <div className="space-y-2">
          <div className="max-h-64 overflow-auto rounded-md border">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-muted"><tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Email</th><th className="p-2 text-left">Phone</th></tr></thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className={cn("border-t", !r.valid && "bg-red-50")}>
                    <td className={cn("p-2", !r.name && "text-red-600")}>{r.name || "missing"}</td>
                    <td className={cn("p-2", !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(r.email) && "text-red-600")}>{r.email || "missing"}</td>
                    <td className="p-2">{r.phone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">{rows.filter((r) => r.valid).length} valid · {rows.filter((r) => !r.valid).length} invalid</p>
          <Button onClick={process} disabled={busy}>{busy ? "Creating…" : `Create ${rows.filter((r) => r.valid).length} accounts`}</Button>
        </div>
      )}

      {results && (
        <div className="space-y-2 rounded-md border p-3 text-sm">
          <p>Created {results.created} · Skipped {results.skipped} · Errors {results.errors}</p>
          <div className="max-h-48 overflow-auto">
            {results.results.filter((r) => r.status === "created").map((r, i) => <p key={i} className="text-xs"><span className="font-medium">{r.email}</span> → <code className="rounded bg-muted px-1">{r.tempPassword}</code></p>)}
          </div>
          <Button variant="outline" size="sm" onClick={() => { setRows([]); setResults(null); }}>Done</Button>
        </div>
      )}
    </section>
  );
}
