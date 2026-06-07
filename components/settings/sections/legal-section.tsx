// Privacy Policy & Terms editor (principal). A simple textarea editor — the
// content is shown publicly on /settings/privacy-policy and /settings/terms and
// linked from the login footer. Parents see the read-only public pages, not this.
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

function Editor({ type }: { type: "privacy" | "terms" }) {
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => { fetch(`/api/settings/legal/${type}`).then((r) => r.json()).then((j) => { setContent(j.content ?? ""); setLoaded(true); }); }, [type]);
  async function save() {
    setBusy(true);
    const res = await fetch(`/api/settings/legal/${type}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content }) });
    setBusy(false);
    if (!res.ok) return toast.error("Save failed");
    toast.success("Saved");
  }
  if (!loaded) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-2">
      <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={14} className="font-mono text-xs" />
      <div className="flex items-center gap-2">
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        <a href={`/settings/${type === "privacy" ? "privacy-policy" : "terms"}`} target="_blank" className="text-sm text-blue-600 hover:underline">Preview public page</a>
      </div>
    </div>
  );
}

export function LegalSection() {
  return (
    <div className="max-w-2xl">
      <Tabs defaultValue="privacy">
        <TabsList><TabsTrigger value="privacy">Privacy Policy</TabsTrigger><TabsTrigger value="terms">Terms of Service</TabsTrigger></TabsList>
        <TabsContent value="privacy"><Editor type="privacy" /></TabsContent>
        <TabsContent value="terms"><Editor type="terms" /></TabsContent>
      </Tabs>
    </div>
  );
}
