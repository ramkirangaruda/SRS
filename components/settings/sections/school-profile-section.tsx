// School Profile. Editable name/contact/affiliation + logo upload. This info
// appears on report cards, broadcast headers, and the login page. We store the
// logo URL after uploading via the shared FileUpload (which serves it through
// Next's optimized delivery where used).
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { FileUpload } from "@/components/file-upload";
import type { StoredFile } from "@/lib/upload-constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const BOARDS = ["CBSE", "ICSE", "STATE", "IB", "OTHER"];

export function SchoolProfileSection() {
  const [form, setForm] = useState({ name: "", address: "", phone: "", email: "", website: "", establishedYear: "", board: "", schoolCode: "", logo: "" });
  const [logo, setLogo] = useState<StoredFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    fetch("/api/settings/school").then((r) => r.json()).then((j) => {
      setForm({ name: j.name ?? "", address: j.address ?? "", phone: j.phone ?? "", email: j.email ?? "", website: j.website ?? "", establishedYear: j.establishedYear ?? "", board: j.board ?? "", schoolCode: j.schoolCode ?? "", logo: j.logo ?? "" });
      if (j.logo) setLogo([{ url: j.logo, name: "logo", size: 0, type: "image" }]);
      setLoaded(true);
    });
  }, []);

  async function save() {
    if (!form.name.trim()) return toast.error("School name is required");
    setBusy(true);
    const res = await fetch("/api/settings/school", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, logo: logo[0]?.url ?? "" }) });
    setBusy(false);
    if (!res.ok) return toast.error("Save failed");
    toast.success("School profile saved");
  }

  if (!loaded) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="max-w-2xl space-y-3">
      <div className="space-y-1"><Label className="text-xs">Logo</Label><FileUpload value={logo} onChange={setLogo} folder="uploads" maxFiles={1} /></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1"><Label className="text-xs">School name</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Phone</Label><Input inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Email</Label><Input type="email" inputMode="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Website</Label><Input value={form.website} onChange={(e) => set("website", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Established year</Label><Input inputMode="numeric" value={form.establishedYear} onChange={(e) => set("establishedYear", e.target.value)} /></div>
        <div className="space-y-1"><Label className="text-xs">Board / Affiliation</Label>
          <Select value={form.board || "_"} onValueChange={(v) => set("board", v === "_" ? "" : v)}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="_">—</SelectItem>{BOARDS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select>
        </div>
        <div className="space-y-1"><Label className="text-xs">School / UDISE code</Label><Input value={form.schoolCode} onChange={(e) => set("schoolCode", e.target.value)} /></div>
      </div>
      <div className="space-y-1"><Label className="text-xs">Address</Label><Textarea value={form.address} onChange={(e) => set("address", e.target.value)} rows={2} /></div>
      <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save Changes"}</Button>
    </div>
  );
}
