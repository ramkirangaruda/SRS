// Enable/disable Web Push on THIS device. Drives the subscription handshake:
// permission → pushManager.subscribe(VAPID public key) → POST the subscription to
// our server. Disabling unsubscribes locally and tells the server to drop it.
"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";

// VAPID public key (base64url) → Uint8Array, the format pushManager wants.
function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function EnablePushButton() {
  const [supported, setSupported] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !("PushManager" in window)) { setSupported(false); return; }
    setPermission(Notification.permission);
    navigator.serviceWorker.ready.then((reg) => reg.pushManager.getSubscription()).then((sub) => setSubscribed(!!sub)).catch(() => {});
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      if (perm !== "granted") { toast.error("Notifications blocked. Enable them in your browser settings."); return; }
      const reg = await navigator.serviceWorker.ready;
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) { toast.error("Push is not configured on this server."); return; }
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
      const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub) });
      if (!res.ok) throw new Error();
      setSubscribed(true); toast.success("Push notifications enabled on this device");
    } catch { toast.error("Could not enable push notifications"); }
    finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
        await sub.unsubscribe();
      }
      setSubscribed(false); toast.success("Push disabled on this device");
    } catch { toast.error("Could not disable"); }
    finally { setBusy(false); }
  }

  if (!supported) return <p className="text-xs text-muted-foreground">Push notifications aren&apos;t supported on this browser.</p>;
  if (permission === "denied") return <p className="text-xs text-amber-600">Notifications are blocked. Enable them in your browser settings, then reload.</p>;

  return subscribed
    ? <Button variant="outline" size="sm" onClick={disable} disabled={busy}><BellOff className="mr-1 h-4 w-4" /> Disable push on this device</Button>
    : <Button size="sm" onClick={enable} disabled={busy}><Bell className="mr-1 h-4 w-4" /> Enable push on this device</Button>;
}
