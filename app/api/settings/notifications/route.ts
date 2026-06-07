// Notification preferences: GET (current user) + PUT (update). Any role.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNotificationPrefs, updateNotificationPrefs } from "@/lib/settings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ prefs: await getNotificationPrefs(session.user.id) });
}

export async function PUT(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const prefs = (body as { prefs?: Record<string, boolean> }).prefs ?? {};
  return NextResponse.json({ prefs: await updateNotificationPrefs(session.user.id, session.user.schoolId, prefs) });
}
