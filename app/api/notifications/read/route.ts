// Mark one notification (by id) or all as read. Any role.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { markRead } from "@/lib/notifications-center";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown = {};
  try { body = await request.json(); } catch { /* empty body = mark all */ }
  const id = (body as { id?: string }).id;
  const unread = await markRead(session.user.id, id);
  return NextResponse.json({ ok: true, unread });
}
