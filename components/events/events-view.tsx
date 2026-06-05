// Events screen built on CalendarView. Demonstrates the renderDay render-prop:
// each day cell shows colored dots (one per event, by type). renderDetails lists
// a day's events with edit/delete (principal). A legend + an upcoming list sit
// below. The SAME CalendarView powers holidays and meals with different renderDay.
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { EventOccurrence } from "@/lib/events";
import type { ClassWithSections } from "@/lib/students";
import { EVENT_TYPES, EVENT_TYPE_META, eventDot } from "@/lib/event-types";
import { CalendarView } from "@/components/calendar-view";
import { EventForm } from "@/components/events/event-form";
import { dayKey, todayKey, formatKey } from "@/lib/calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ALL = "all";

export function EventsView({
  editable, endpoint, classes = [], upcomingEndpoint,
}: {
  editable: boolean;
  endpoint: string;
  classes?: ClassWithSections[];
  upcomingEndpoint?: string;
}) {
  const now = new Date();
  const [year, setYear] = useState(now.getUTCFullYear());
  const [month, setMonth] = useState(now.getUTCMonth() + 1);
  const [type, setType] = useState("");
  const [items, setItems] = useState<EventOccurrence[]>([]);
  const [upcoming, setUpcoming] = useState<EventOccurrence[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventOccurrence | null>(null);
  const [formDate, setFormDate] = useState<string | undefined>();

  const fetchMonth = useCallback(async (y: number, m: number, t: string) => {
    const qs = new URLSearchParams({ year: String(y), month: String(m) });
    if (t) qs.set("type", t);
    const res = await fetch(`${endpoint}?${qs}`);
    const json = await res.json();
    setItems(json.data ?? []);
  }, [endpoint]);

  useEffect(() => { fetchMonth(year, month, type); }, [year, month, type, fetchMonth]);

  useEffect(() => {
    if (upcomingEndpoint) fetch(upcomingEndpoint).then((r) => r.json()).then((j) => setUpcoming(j.data ?? []));
  }, [upcomingEndpoint]);

  // Without a dedicated upcoming endpoint (parent), derive from loaded month.
  const upcomingList = useMemo(() => {
    if (upcomingEndpoint) return upcoming;
    const t = todayKey();
    return items.filter((e) => e.occurrenceKey >= t).slice(0, 10);
  }, [upcoming, upcomingEndpoint, items]);

  function refresh() { fetchMonth(year, month, type); if (upcomingEndpoint) fetch(upcomingEndpoint).then((r) => r.json()).then((j) => setUpcoming(j.data ?? [])); }

  async function del(occ: EventOccurrence, scope: "all" | "occurrence") {
    const qs = new URLSearchParams({ scope });
    if (scope === "occurrence") qs.set("date", occ.occurrenceKey);
    const res = await fetch(`/api/events/${occ.id}?${qs}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Delete failed");
    toast.success("Deleted");
    refresh();
  }

  // RENDER PROP #1 — what shows inside each day cell: up to 3 dots, then "+N".
  const renderDay = (key: string, dayItems: EventOccurrence[]) => (
    <div className="mt-auto flex flex-wrap gap-0.5">
      {dayItems.slice(0, 3).map((e, i) => <span key={i} className={`h-1.5 w-1.5 rounded-full ${eventDot(e.type)}`} />)}
      {dayItems.length > 3 && <span className="text-[9px] text-muted-foreground">+{dayItems.length - 3}</span>}
    </div>
  );

  // RENDER PROP #2 — the day's detail panel/sheet content.
  const renderDetails = (key: string, dayItems: EventOccurrence[]) => (
    <div className="space-y-3">
      {editable && (
        <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => { setEditing(null); setFormDate(key); setFormOpen(true); }}>
          <Plus className="h-4 w-4" /> Add on {formatKey(key)}
        </Button>
      )}
      {dayItems.length === 0 ? <p className="text-sm text-muted-foreground">No events.</p> : dayItems.map((e) => (
        <div key={e.occurrenceKey + e.id} className="rounded-md border p-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${eventDot(e.type)}`} />
            <span className="font-medium">{e.title}</span>
            {e.isRecurring && <Badge variant="secondary">recurring</Badge>}
          </div>
          {e.description && <p className="mt-1 text-muted-foreground">{e.description}</p>}
          {e.endDate && <p className="text-xs text-muted-foreground">until {formatKey(dayKey(e.endDate))}</p>}
          {editable && (
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="ghost" className="h-7 gap-1" onClick={() => { setEditing(e); setFormOpen(true); }}><Pencil className="h-3 w-3" /> Edit</Button>
              {e.isRecurring ? (
                <>
                  <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => del(e, "occurrence")}>Delete this</Button>
                  <Button size="sm" variant="ghost" className="h-7 text-destructive" onClick={() => del(e, "all")}>Delete all</Button>
                </>
              ) : (
                <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" onClick={() => del(e, "all")}><Trash2 className="h-3 w-3" /> Delete</Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Events</h1>
        <div className="flex items-center gap-2">
          <Select value={type || ALL} onValueChange={(v) => setType(v === ALL ? "" : v)}>
            <SelectTrigger className="w-36"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All types</SelectItem>
              {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{EVENT_TYPE_META[t].label}</SelectItem>)}
            </SelectContent>
          </Select>
          {editable && <Button className="gap-1" onClick={() => { setEditing(null); setFormDate(undefined); setFormOpen(true); }}><Plus className="h-4 w-4" /><span className="hidden sm:inline">Add Event</span></Button>}
        </div>
      </div>

      <CalendarView
        year={year} month={month}
        onMonthChange={(y, m) => { setYear(y); setMonth(m); }}
        items={items}
        renderDay={renderDay}
        renderDetails={renderDetails}
      />

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs">
        {EVENT_TYPES.map((t) => (
          <span key={t} className="flex items-center gap-1"><span className={`h-2.5 w-2.5 rounded-full ${EVENT_TYPE_META[t].dot}`} /> {EVENT_TYPE_META[t].label}</span>
        ))}
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="mb-2 text-lg font-semibold">Upcoming (next 30 days)</h2>
        {upcomingList.length === 0 ? (
          <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">No upcoming events.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {upcomingList.map((e) => (
              <Card key={e.id + e.occurrenceKey}><CardContent className="flex items-center gap-3 p-3">
                <span className={`h-2.5 w-2.5 rounded-full ${eventDot(e.type)}`} />
                <div className="min-w-0 flex-1"><p className="font-medium">{e.title}</p><p className="text-xs text-muted-foreground">{EVENT_TYPE_META[(e.type as keyof typeof EVENT_TYPE_META)]?.label ?? e.type}</p></div>
                <span className="text-sm text-muted-foreground">{formatKey(e.occurrenceKey)}</span>
              </CardContent></Card>
            ))}
          </div>
        )}
      </div>

      {editable && (
        <EventForm
          open={formOpen}
          onOpenChange={setFormOpen}
          classes={classes}
          defaultDate={formDate}
          initial={editing ? { id: editing.id, title: editing.title, description: editing.description ?? "", date: dayKey(editing.date), endDate: editing.endDate ? dayKey(editing.endDate) : "", type: editing.type as never, isRecurring: editing.isRecurring } : undefined}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
