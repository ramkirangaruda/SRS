// Messages: GET (paginated history OR ?since= for polling) + POST (send).
// Every call requires active membership. GET also advances the read cursor.
import { NextResponse } from "next/server";
import { requireAnyRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getMembership, listMessages, listMessagesSince, sendMessage, markRead } from "@/lib/meeting-room";
import { messageSchema } from "@/lib/validations/meeting-room";

export async function GET(request: Request, { params }: { params: { groupId: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  if (!(await getMembership(params.groupId, auth.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since");
  // Polling path: only messages after `since`. Also marks read (the chat is open).
  if (since) {
    const messages = await listMessagesSince(params.groupId, auth.id, since);
    await markRead(params.groupId, auth.id);
    return NextResponse.json({ messages });
  }

  // History path: a page of newest-first messages (client reverses for display).
  const result = await listMessages(params.groupId, auth.id, searchParams.get("cursor") ?? undefined);
  // Opening / scrolling the chat marks it read up to now.
  await markRead(params.groupId, auth.id);
  return NextResponse.json(result);
}

export async function POST(request: Request, { params }: { params: { groupId: string } }) {
  const auth = await requireAnyRole([ROLES.PRINCIPAL, ROLES.TEACHER]);
  if (auth instanceof NextResponse) return auth;
  if (!(await getMembership(params.groupId, auth.id))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  const msg = await sendMessage(params.groupId, auth.id, parsed.data.message);
  return NextResponse.json(msg, { status: 201 });
}
