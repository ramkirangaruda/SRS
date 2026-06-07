// Notification preferences — one toggle per category. Saved preferences are
// checked at SEND time (lib/settings isNotificationEnabled) by each producer
// (broadcast, fees, etc.), so an opted-out notification is never even created.
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { NOTIFICATION_TYPES } from "@/lib/settings";
import { cn } from "@/lib/utils";

const LABELS: Record<string, string> = {
  BROADCAST: "Broadcast messages", HOMEWORK: "Homework alerts", FEES: "Fee reminders",
  ATTENDANCE: "Attendance alerts", EVENTS: "Event reminders", DIARY: "Diary updates",
};

export function NotificationsSection() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { fetch("/api/settings/notifications").then((r) => r.json()).then((j) => { setPrefs(j.prefs); setLoaded(true); }); }, []);

  async function toggle(type: string) {
    const next = { ...prefs, [type]: !prefs[type] };
    setPrefs(next); // optimistic
    const res = await fetch("/api/settings/notifications", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prefs: next }) });
    if (!res.ok) { toast.error("Failed"); setPrefs(prefs); return; }
  }

  if (!loaded) return <p className="text-sm text-muted-foreground">Loading…</p>;
  return (
    <div className="max-w-md space-y-2">
      {NOTIFICATION_TYPES.map((type) => (
        <div key={type} className="flex items-center justify-between rounded-md border p-3">
          <span className="text-sm font-medium">{LABELS[type]}</span>
          <button role="switch" aria-checked={prefs[type]} aria-label={LABELS[type]} onClick={() => toggle(type)}
            className={cn("relative h-6 w-11 rounded-full transition", prefs[type] ? "bg-primary" : "bg-muted")}>
            <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", prefs[type] ? "left-[22px]" : "left-0.5")} />
          </button>
        </div>
      ))}
    </div>
  );
}
