// Submit a bug report with auto-collected device info (any role).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createBugReport } from "@/lib/settings";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const b = body as { description?: string; deviceInfo?: unknown; screenshot?: string };
  if (!b.description?.trim()) return NextResponse.json({ error: "Description is required" }, { status: 422 });
  await createBugReport(session.user.schoolId, session.user.id, b.description.trim(), b.deviceInfo ? JSON.stringify(b.deviceInfo) : null, b.screenshot ?? null);
  return NextResponse.json({ ok: true });
}
