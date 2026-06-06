// Enquiry Kanban board with @dnd-kit.
//
// HOW @dnd-kit FITS TOGETHER:
//  • DndContext wraps the whole board and owns drag state. It fires onDragStart /
//    onDragEnd with the active (dragged) and over (drop target) ids.
//  • useDraggable turns each card into something you can pick up — it gives us
//    listeners/attributes to spread on the card and a transform to follow the cursor.
//  • useDroppable marks each column as a drop zone with an id (the status).
//  • Sensors decide what starts a drag: PointerSensor (mouse) + TouchSensor (mobile,
//    with a short press delay so scrolling the board still works).
// On drop we read which column the card landed in and run the status transition —
// most transitions first prompt for the required info (note / visit date / reason).
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DndContext, useDraggable, useDroppable, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { ENQUIRY_STATUSES, CLOSURE_REASONS, type EnquiryCard as Card } from "@/lib/enquiry";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLS: { key: string; label: string }[] = [
  { key: "NEW", label: "New" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "VISIT_SCHEDULED", label: "Visit Scheduled" },
  { key: "CONVERTED", label: "Converted" },
  { key: "CLOSED", label: "Closed" },
];

type Pending = { card: Card; toStatus: string };

export function EnquiryBoard({ grouped, onChanged, onOpenCard }: { grouped: Record<string, Card[]>; onChanged: () => void; onOpenCard: (id: string) => void }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  // Touch needs a small delay so a tap-scroll doesn't immediately start a drag.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  );

  async function applyStatus(card: Card, toStatus: string, extra: { note?: string; followUpDate?: string; closureReason?: string } = {}) {
    const res = await fetch(`/api/enquiry/${card.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toStatus, ...extra }) });
    if (!res.ok) { toast.error("Update failed"); return; }
    const j = await res.json();
    if (toStatus === "CONVERTED" && j.prefill) {
      toast.success("Converting to admission…");
      // Carry the enquiry id so the admission form pre-fills + links back.
      router.push(`/principal/admissions?convertFrom=${card.id}`);
      return;
    }
    toast.success("Moved to " + toStatus.replace(/_/g, " "));
    onChanged();
  }

  function onDragEnd(e: DragEndEvent) {
    const cardId = String(e.active.id);
    const toStatus = e.over ? String(e.over.id) : null;
    if (!toStatus || !ENQUIRY_STATUSES.includes(toStatus as never)) return;
    const card = Object.values(grouped).flat().find((c) => c.id === cardId);
    if (!card || card.status === toStatus) return;
    // Transitions that need extra info open a prompt; NEW applies directly.
    if (toStatus === "NEW") { applyStatus(card, toStatus); return; }
    setPending({ card, toStatus });
  }

  return (
    <>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        {/* Horizontal scroll on mobile with snap-to-column. */}
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
          {COLS.map((col) => (
            <Column key={col.key} id={col.key} label={col.label} count={grouped[col.key]?.length ?? 0}>
              {(grouped[col.key] ?? []).map((card) => <DraggableCard key={card.id} card={card} onOpen={() => onOpenCard(card.id)} />)}
            </Column>
          ))}
        </div>
      </DndContext>

      {pending && <TransitionDialog pending={pending} onClose={() => setPending(null)} onConfirm={(extra) => { applyStatus(pending.card, pending.toStatus, extra); setPending(null); }} />}
    </>
  );
}

function Column({ id, label, count, children }: { id: string; label: string; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={cn("w-72 shrink-0 snap-start rounded-lg border bg-muted/30 p-2", isOver && "ring-2 ring-primary")}>
      <p className="mb-2 px-1 text-sm font-semibold">{label} <span className="text-muted-foreground">({count})</span></p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DraggableCard({ card, onOpen }: { card: Card; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("rounded-md border bg-background p-2 shadow-sm", isDragging && "opacity-50")}
    >
      {/* Drag handle = the body; a separate click opens the detail. */}
      <div {...listeners} {...attributes} className="cursor-grab active:cursor-grabbing">
        <p className="text-sm font-medium leading-tight">{card.parentName}</p>
        {card.childName && <p className="text-xs text-muted-foreground">Child: {card.childName}</p>}
        <p className="text-xs text-muted-foreground">{card.phone}{card.classInterestedIn ? ` · ${card.classInterestedIn}` : ""}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{card.source}</span>
          {card.categoryName && <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{card.categoryName}</span>}
        </div>
      </div>
      <button onClick={onOpen} className="mt-1 text-[11px] text-blue-600 hover:underline">Open</button>
    </div>
  );
}

// Collects the info a transition requires, then confirms.
function TransitionDialog({ pending, onClose, onConfirm }: { pending: Pending; onClose: () => void; onConfirm: (extra: { note?: string; followUpDate?: string; closureReason?: string }) => void }) {
  const { toStatus } = pending;
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [closureReason, setClosureReason] = useState<string>(CLOSURE_REASONS[0]);

  const titles: Record<string, string> = { CONTACTED: "Mark as contacted", VISIT_SCHEDULED: "Schedule a visit", CONVERTED: "Convert to admission", CLOSED: "Close enquiry" };

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{titles[toStatus] ?? "Update status"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {toStatus === "CONTACTED" && <div className="space-y-1"><Label className="text-xs">What was discussed?</Label><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} /></div>}
          {toStatus === "VISIT_SCHEDULED" && <>
            <div className="space-y-1"><Label className="text-xs">Visit date & time</Label><Input type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-xs">Note</Label><Input value={note} onChange={(e) => setNote(e.target.value)} /></div>
          </>}
          {toStatus === "CONVERTED" && <p className="text-sm text-muted-foreground">This opens a pre-filled admission application linked to this enquiry.</p>}
          {toStatus === "CLOSED" && <div className="space-y-1"><Label className="text-xs">Reason</Label>
            <Select value={closureReason} onValueChange={setClosureReason}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{CLOSURE_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select>
          </div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onConfirm({ note: note || undefined, followUpDate: followUpDate || undefined, closureReason: toStatus === "CLOSED" ? closureReason : undefined })}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
