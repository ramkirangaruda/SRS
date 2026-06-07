// Custom PWA install banner.
//
// The browser fires `beforeinstallprompt` when the app is installable; we can't
// force-show the native prompt (anti-spam), but we CAN capture that event,
// `preventDefault()` it, and call `.prompt()` later from our own button. We only
// show our banner after the user has visited 3+ times (a localStorage counter)
// and never again once installed/dismissed. In standalone mode there's nothing to
// install, so we render nothing.
"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const VISIT_KEY = "ss-visit-count";
const DISMISS_KEY = "ss-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Already installed (standalone) or previously dismissed → never show.
    if (window.matchMedia("(display-mode: standalone)").matches || localStorage.getItem(DISMISS_KEY)) return;
    const visits = Number(localStorage.getItem(VISIT_KEY) ?? "0") + 1;
    localStorage.setItem(VISIT_KEY, String(visits));

    const onBIP = (e: Event) => {
      e.preventDefault(); // stash it; we'll trigger from our button
      setDeferred(e as BIPEvent);
      if (visits >= 3) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBIP);
    // Hide permanently once installed.
    const onInstalled = () => { setShow(false); localStorage.setItem(DISMISS_KEY, "1"); };
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onBIP); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setShow(false); setDeferred(null); localStorage.setItem(DISMISS_KEY, "1");
  }
  function dismiss() { setShow(false); localStorage.setItem(DISMISS_KEY, "1"); }

  if (!show) return null;
  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-sm items-center gap-3 rounded-lg border bg-background p-3 shadow-lg md:bottom-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="h-10 w-10 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">Install SchoolSync</p>
        <p className="text-xs text-muted-foreground">Add to your home screen for quick access.</p>
      </div>
      <Button size="sm" onClick={install}><Download className="mr-1 h-4 w-4" /> Install</Button>
      <button onClick={dismiss} aria-label="Not now" className="rounded p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button>
    </div>
  );
}
