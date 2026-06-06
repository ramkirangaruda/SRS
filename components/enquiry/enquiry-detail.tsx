// Enquiry detail: full info + activity timeline + add-note / schedule-follow-up /
// convert-to-admission actions.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Phone, StickyNote, CalendarClock, ArrowRightCircle, GitBranch } from "lucide-react";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Activity = { id: string; activityType: string; fromStatus: string | null; toStatus: string | null; note: string | null; performedByName: string | null; createdAt: string };
type Enquiry = {
  id: string; parentName: string; phone: string; email: string | null; address?: string | null; childName: string | null; childAge?: string | null;
  childGender?: string | null; currentSchool?: string | null; classInterestedIn: string | null; source: string; status: string;
  categoryName: string | null; followUpDate: string | null; closureReason: string | null; convertedToAdmissionId: string | null;
  message?: string | null; createdAt: string; activities: Activity[];
};

const statusVariant = (s: string) => (s === "CONVERTED" ? "success" : s === "CLOSED" ? "destructive" : "secondary");

export function EnquiryDetail({ enquiry }: { enquiry: Enquiry }) {
  const router = useRouter();
  const [noteOpen, setNoteOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);

  async function convert() {
    const res = await fetch(`/api/enquiry/${enquiry.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toStatus: "CONVERTED" }) });
    if (!res.ok) { toast.error("Convert failed"); return; }
    router.push(`/principal/admissions?convertFrom=${enquiry.id}`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{enquiry.parentName}</h1>
          <p className="text-muted-foreground">{enquiry.phone}{enquiry.email ? ` · ${enquiry.email}` : ""}</p>
        </div>
        <Badge variant={statusVariant(enquiry.status)}>{enquiry.status.replace(/_/g, " ")}</Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => setNoteOpen(true)}><StickyNote className="mr-1 h-4 w-4" /> Add Note</Button>
        <Button variant="outline" size="sm" onClick={() => setFollowUpOpen(true)}><CalendarClock className="mr-1 h-4 w-4" /> Schedule Follow-up</Button>
        {enquiry.status !== "CONVERTED" && enquiry.status !== "CLOSED" && <Button size="sm" onClick={convert}><ArrowRightCircle className="mr-1 h-4 w-4" /> Convert to Admission</Button>}
        {enquiry.convertedToAdmissionId && <Button variant="outline" size="sm" asChild><a href={`/principal/admissions/${enquiry.convertedToAdmissionId}`}><GitBranch className="mr-1 h-4 w-4" /> View admission</a></Button>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-lg">Student</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">
          <Row label="Child" value={enquiry.childName ?? "—"} />
          <Row label="Age/DOB" value={enquiry.childAge ?? "—"} />
          <Row label="Gender" value={enquiry.childGender ?? "—"} />
          <Row label="Class" value={enquiry.classInterestedIn ?? "—"} />
          <Row label="Current school" value={enquiry.currentSchool ?? "—"} />
        </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-lg">Enquiry</CardTitle></CardHeader><CardContent className="space-y-1 text-sm">
          <Row label="Source" value={enquiry.source} />
          <Row label="Category" value={enquiry.categoryName ?? "—"} />
          <Row label="Follow-up" value={enquiry.followUpDate ? formatDate(enquiry.followUpDate) : "—"} />
          <Row label="Created" value={formatDate(enquiry.createdAt)} />
          {enquiry.closureReason && <Row label="Closure reason" value={enquiry.closureReason} />}
          {enquiry.message && <p className="pt-1 text-muted-foreground">{enquiry.message}</p>}
        </CardContent></Card>
      </div>

      <Card><CardHeader><CardTitle className="text-lg">Activity timeline</CardTitle></CardHeader><CardContent>
        {enquiry.activities.length === 0 ? <p className="text-sm text-muted-foreground">No activity yet.</p> : (
          <ul className="space-y-3">
            {enquiry.activities.map((a) => (
              <li key={a.id} className="flex gap-3 text-sm">
                <span className="mt-0.5">{a.activityType === "CALL" ? <Phone className="h-4 w-4 text-blue-600" /> : a.activityType === "FOLLOW_UP" ? <CalendarClock className="h-4 w-4 text-violet-600" /> : a.activityType === "STATUS_CHANGE" ? <ArrowRightCircle className="h-4 w-4 text-emerald-600" /> : <StickyNote className="h-4 w-4 text-amber-600" />}</span>
                <div>
                  <p>{a.activityType === "STATUS_CHANGE" ? <>Status: {a.fromStatus ?? "—"} → <strong>{a.toStatus}</strong></> : a.activityType.replace(/_/g, " ")}{a.note ? ` — ${a.note}` : ""}</p>
                  <p className="text-xs text-muted-foreground">{a.performedByName ?? "—"} · {new Date(a.createdAt).toLocaleString()}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent></Card>

      <ActivityDialog enquiryId={enquiry.id} open={noteOpen} onOpenChange={setNoteOpen} mode="note" onSaved={() => router.refresh()} />
      <ActivityDialog enquiryId={enquiry.id} open={followUpOpen} onOpenChange={setFollowUpOpen} mode="followup" onSaved={() => router.refresh()} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between gap-4"><span className="text-muted-foreground">{label}</span><span className="text-right font-medium">{value}</span></div>;
}

function ActivityDialog({ enquiryId, open, onOpenChange, mode, onSaved }: { enquiryId: string; open: boolean; onOpenChange: (v: boolean) => void; mode: "note" | "followup"; onSaved: () => void }) {
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [isCall, setIsCall] = useState(false);

  async function save() {
    if (!note.trim()) { toast.error("Note is required"); return; }
    const body = mode === "followup"
      ? { activityType: "FOLLOW_UP", note, followUpDate: date || undefined }
      : { activityType: isCall ? "CALL" : "NOTE", note };
    const res = await fetch(`/api/enquiry/${enquiryId}/activity`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) { toast.error("Save failed"); return; }
    toast.success("Logged"); setNote(""); setDate(""); onOpenChange(false); onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{mode === "followup" ? "Schedule follow-up" : "Add note / log call"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {mode === "followup" && <div className="space-y-1"><Label className="text-xs">Follow-up date</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>}
          {mode === "note" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={isCall} onChange={(e) => setIsCall(e.target.checked)} className="h-4 w-4" /> This was a phone call</label>}
          <div className="space-y-1"><Label className="text-xs">Note</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
