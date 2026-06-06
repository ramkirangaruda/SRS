// Parent virtual classroom view. Shows upcoming/live classes for the parent's
// children with a live countdown + Join button, and a list of recordings to
// watch. Polls every 30s so a class flips to "Join now" on its own.
"use client";

import { useCallback, useEffect, useState } from "react";
import { Video, Film, ExternalLink, Smartphone } from "lucide-react";
import type { VCItem } from "@/lib/virtual-classroom";
import { appDeepLink, meetingProvider } from "@/lib/meeting-links";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { VCStatusBadge } from "@/components/virtual-classroom/vc-status-badge";

type Data = { upcoming: VCItem[]; recordings: VCItem[] };

// Human countdown to a future time, e.g. "in 2h 15m" / "in 3m".
function countdown(iso: string, nowMs: number): string {
  const diff = new Date(iso).getTime() - nowMs;
  if (diff <= 0) return "now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return `in ${h}h ${m}m`;
  return `in ${Math.floor(h / 24)}d`;
}

export function ParentVirtualClassroom({ initial }: { initial: Data }) {
  const [data, setData] = useState<Data>(initial);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const res = await fetch("/api/parent/virtual-classroom");
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => { const id = setInterval(load, 30_000); return () => clearInterval(id); }, [load]);
  // Tick every 30s so the countdown stays live.
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(id); }, []);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="font-semibold">Upcoming & Live</h2>
        {data.upcoming.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming classes.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.upcoming.map((i) => {
              const deep = appDeepLink(i.meetingLink);
              return (
                <Card key={i.id} className={i.status === "LIVE" ? "border-red-300" : ""}>
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2"><Video className="h-4 w-4 text-muted-foreground" /><span className="font-medium leading-tight">{i.title}</span></div>
                      <VCStatusBadge status={i.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(i.scheduledAt)} · {new Date(i.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {i.status === "UPCOMING" && <span className="ml-1 font-medium text-foreground">· {countdown(i.scheduledAt, now)}</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">{i.subjectName ?? "Class"} · {i.hostName}</p>
                    {i.status === "LIVE" && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button size="sm" asChild><a href={i.meetingLink} target="_blank"><ExternalLink className="mr-1 h-3 w-3" /> Join now</a></Button>
                        {deep && <Button size="sm" variant="outline" asChild><a href={deep}><Smartphone className="mr-1 h-3 w-3" /> Open in {meetingProvider(i.meetingLink) === "zoom" ? "Zoom" : "app"}</a></Button>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Recordings</h2>
        {data.recordings.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recordings yet.</p>
        ) : (
          <div className="space-y-2">
            {data.recordings.map((i) => (
              <Card key={i.id}>
                <CardContent className="flex items-center justify-between gap-2 p-3">
                  <div>
                    <p className="text-sm font-medium">{i.title}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(i.scheduledAt)} · {i.subjectName ?? "Class"}</p>
                  </div>
                  <Button size="sm" variant="outline" asChild><a href={i.recordingUrl!} target="_blank"><Film className="mr-1 h-3 w-3" /> Watch</a></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
