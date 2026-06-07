// Web Push + in-app notifications.
//
// sendPushNotification(userId, …) does THREE things:
//   1. Respect the user's NotificationPreference for this category (skip if off).
//   2. Create an in-app Notification row (the bell dropdown record).
//   3. Encrypt + send the payload to each of the user's PushSubscriptions via the
//      push service. A dead subscription (404/410 Gone) is deleted — that's
//      subscription lifecycle management: endpoints expire when a user clears the
//      browser / revokes permission, and we must prune them so we stop trying.
import webpush from "web-push";
import { prisma } from "@/lib/prisma";
import { isNotificationEnabled } from "@/lib/settings";

// Configure VAPID once (module load). If keys are missing (e.g. local without
// push set up) we leave it unconfigured and only do the in-app record.
const PUBLIC = process.env.VAPID_PUBLIC_KEY;
const PRIVATE = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@schoolsync.app";
let configured = false;
if (PUBLIC && PRIVATE) {
  try { webpush.setVapidDetails(SUBJECT, PUBLIC, PRIVATE); configured = true; } catch { configured = false; }
}

// Maps a notification type to the preference category that gates it. Types not
// listed here (e.g. GENERAL) are always delivered.
const TYPE_TO_PREF: Record<string, string> = {
  BROADCAST: "BROADCAST", HOMEWORK: "HOMEWORK", FEES: "FEES", ATTENDANCE: "ATTENDANCE", EVENTS: "EVENTS", DIARY: "DIARY",
};

export async function sendPushNotification(userId: string, payload: { title: string; body: string; url?: string; type?: string }) {
  const type = payload.type ?? "GENERAL";

  // 1. Preference check — never deliver a category the user turned off.
  const prefCategory = TYPE_TO_PREF[type];
  if (prefCategory && !(await isNotificationEnabled(userId, prefCategory))) return;

  // 2. In-app record (so it shows in the bell even if push fails / is unsupported).
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { schoolId: true } });
  if (!user) return;
  await prisma.notification.create({ data: { userId, title: payload.title, body: payload.body, url: payload.url ?? null, type, schoolId: user.schoolId } });

  // 3. Web push to each device, if configured.
  if (!configured) return;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  const data = JSON.stringify({ title: payload.title, body: payload.body, url: payload.url ?? "/", type });
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, data);
    } catch (e: unknown) {
      const code = (e as { statusCode?: number }).statusCode;
      // 404/410 = the subscription is gone for good → prune it.
      if (code === 404 || code === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
    }
  }));
}

// Fan out to many users (e.g. all parents of a class) — used by broadcast/homework.
export async function sendToMany(userIds: string[], payload: { title: string; body: string; url?: string; type?: string }) {
  await Promise.all(userIds.map((id) => sendPushNotification(id, payload).catch(() => {})));
}
