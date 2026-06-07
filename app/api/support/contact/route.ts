// Submit a support contact message (any logged-in role). Stored for the admin.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createSupportMessage } from "@/lib/settings";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const b = body as { subject?: string; message?: string };
  if (!b.subject?.trim() || !b.message?.trim()) return NextResponse.json({ error: "Subject and message are required" }, { status: 422 });
  await createSupportMessage(session.user.schoolId, session.user.id, b.subject.trim(), b.message.trim());
  return NextResponse.json({ ok: true });
}
