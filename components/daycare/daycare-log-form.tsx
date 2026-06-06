// The daily daycare log form. Single scrollable page (mobile-friendly) with
// clear sections: check-in/out, mood, activities, meals, nap, notes.
//
// AUTO-SAVE WITH DEBOUNCE: we DON'T fire an API call per keystroke or per field.
// Every edit updates local state and marks it dirty; a single debounced timer
// (1.2s after the LAST change) then sends ONE "sync save" with the whole form.
// So a teacher typing fast across several fields produces one request, not ten.
// We also flush on blur for snappy feedback. The save is a full-state replace
// (see lib/daycare syncLog), so retries and out-of-order edits can't corrupt it.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Plus, Trash2, Check, Loader2, AlertCircle } from "lucide-react";
import type { FullLog } from "@/lib/daycare";
import { ACTIVITY_TYPES, MEAL_TYPES, NAP_QUALITIES } from "@/lib/daycare";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoodSelector } from "@/components/daycare/mood-selector";

type Activity = { time: string; activityType: string; activityName: string; notes: string };
type MealState = Record<string, { eaten: boolean; time: string; notes: string }>;
type Nap = { startTime: string; endTime: string; quality: string };

// ISO instant → "HH:MM" local for the time inputs.
function isoToTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
// "HH:MM" on the log's date → ISO instant (or null).
function timeToIso(t: string, dateKey: string): string | null {
  if (!t) return null;
  return new Date(`${dateKey}T${t}:00`).toISOString();
}

export function DaycareLogForm({ studentId, dateKey, initial }: { studentId: string; dateKey: string; initial: FullLog }) {
  const [checkIn, setCheckIn] = useState(isoToTime(initial.checkInTime));
  const [checkOut, setCheckOut] = useState(isoToTime(initial.checkOutTime));
  const [mood, setMood] = useState<string | null>(initial.mood);
  const [notes, setNotes] = useState(initial.generalNotes ?? "");
  const [activities, setActivities] = useState<Activity[]>(initial.activities.map((a) => ({ time: a.time ?? "", activityType: a.activityType, activityName: a.activityName ?? "", notes: a.notes ?? "" })));
  const [meals, setMeals] = useState<MealState>(() => {
    const m: MealState = {};
    for (const mt of MEAL_TYPES) { const found = initial.meals.find((x) => x.mealType === mt); m[mt] = { eaten: found?.eaten ?? false, time: found?.time ?? "", notes: found?.notes ?? "" }; }
    return m;
  });
  const [nap, setNap] = useState<Nap>(() => { const n = initial.naps[0]; return { startTime: n?.startTime ?? "", endTime: n?.endTime ?? "", quality: n?.quality ?? "" }; });

  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const firstRun = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    setStatus("saving");
    const payload = {
      date: dateKey,
      checkInTime: timeToIso(checkIn, dateKey), checkOutTime: timeToIso(checkOut, dateKey),
      mood, generalNotes: notes,
      activities: activities.filter((a) => a.activityType || a.activityName).map((a) => ({ time: a.time || null, activityType: a.activityType, activityName: a.activityName || null, notes: a.notes || null })),
      meals: MEAL_TYPES.filter((mt) => meals[mt].eaten || meals[mt].time || meals[mt].notes).map((mt) => ({ mealType: mt, eaten: meals[mt].eaten, time: meals[mt].time || null, notes: meals[mt].notes || null })),
      naps: (nap.startTime || nap.endTime || nap.quality) ? [{ startTime: nap.startTime || null, endTime: nap.endTime || null, quality: nap.quality || null }] : [],
    };
    try {
      const res = await fetch(`/api/daycare/log/${studentId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      setStatus(res.ok ? "saved" : "error");
    } catch { setStatus("error"); }
  }, [studentId, dateKey, checkIn, checkOut, mood, notes, activities, meals, nap]);

  // Debounced auto-save: coalesce rapid edits into ONE save 1.2s after the last.
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    if (timer.current) clearTimeout(timer.current);
    setStatus("saving");
    timer.current = setTimeout(save, 1200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [save]);

  // Flush immediately on blur (don't wait out the debounce).
  function flush() { if (timer.current) clearTimeout(timer.current); save(); }

  const addActivity = () => setActivities((a) => [...a, { time: "", activityType: "FREE_PLAY", activityName: "", notes: "" }]);
  const updateActivity = (i: number, k: keyof Activity, v: string) => setActivities((a) => a.map((x, idx) => (idx === i ? { ...x, [k]: v } : x)));
  const removeActivity = (i: number) => setActivities((a) => a.filter((_, idx) => idx !== i));
  const setMeal = (mt: string, k: "eaten" | "time" | "notes", v: boolean | string) => setMeals((m) => ({ ...m, [mt]: { ...m[mt], [k]: v } }));

  return (
    <div className="space-y-5" onBlur={flush}>
      {/* Save status */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {status === "saving" && <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>}
        {status === "saved" && <><Check className="h-3 w-3 text-emerald-600" /> Saved</>}
        {status === "error" && <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> Save failed — <button onClick={save} className="underline">retry</button></span>}
      </div>

      <Section title="Check-in / Check-out">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1"><Label className="text-xs">Check-in</Label><Input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-xs">Check-out</Label><Input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></div>
        </div>
      </Section>

      <Section title="Mood"><MoodSelector value={mood} onChange={setMood} /></Section>

      <Section title="Activities" action={<Button size="sm" variant="outline" onClick={addActivity}><Plus className="mr-1 h-4 w-4" /> Add</Button>}>
        {activities.length === 0 ? <p className="text-sm text-muted-foreground">No activities yet.</p> : (
          <div className="space-y-2">
            {activities.map((a, i) => (
              <div key={i} className="grid grid-cols-[80px_1fr_auto] gap-2 rounded-md border p-2">
                <Input type="time" value={a.time} onChange={(e) => updateActivity(i, "time", e.target.value)} />
                <div className="space-y-1">
                  <Select value={a.activityType} onValueChange={(v) => updateActivity(i, "activityType", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{ACTIVITY_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
                  <Input placeholder="Notes" value={a.notes} onChange={(e) => updateActivity(i, "notes", e.target.value)} />
                </div>
                <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeActivity(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Meals">
        <div className="space-y-2">
          {MEAL_TYPES.map((mt) => (
            <div key={mt} className="flex flex-wrap items-center gap-2 rounded-md border p-2">
              <label className="flex w-40 items-center gap-2 text-sm font-medium"><input type="checkbox" checked={meals[mt].eaten} onChange={(e) => setMeal(mt, "eaten", e.target.checked)} className="h-4 w-4" /> {mt.replace(/_/g, " ")}</label>
              <Input type="time" className="w-28" value={meals[mt].time} onChange={(e) => setMeal(mt, "time", e.target.value)} />
              <Input className="flex-1 min-w-32" placeholder="Notes (e.g. ate well)" value={meals[mt].notes} onChange={(e) => setMeal(mt, "notes", e.target.value)} />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Nap">
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1"><Label className="text-xs">Start</Label><Input type="time" value={nap.startTime} onChange={(e) => setNap((n) => ({ ...n, startTime: e.target.value }))} /></div>
          <div className="space-y-1"><Label className="text-xs">End</Label><Input type="time" value={nap.endTime} onChange={(e) => setNap((n) => ({ ...n, endTime: e.target.value }))} /></div>
          <div className="space-y-1"><Label className="text-xs">Quality</Label>
            <Select value={nap.quality || "__none__"} onValueChange={(v) => setNap((n) => ({ ...n, quality: v === "__none__" ? "" : v }))}><SelectTrigger><SelectValue placeholder="—" /></SelectTrigger><SelectContent><SelectItem value="__none__">—</SelectItem>{NAP_QUALITIES.map((q) => <SelectItem key={q} value={q}>{q.replace(/_/g, " ")}</SelectItem>)}</SelectContent></Select>
          </div>
        </div>
      </Section>

      <Section title="General notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Anything else about the day…" /></Section>
    </div>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-2 border-t pt-4 first:border-0 first:pt-0">
      <div className="flex items-center justify-between"><h3 className="font-semibold">{title}</h3>{action}</div>
      {children}
    </div>
  );
}
