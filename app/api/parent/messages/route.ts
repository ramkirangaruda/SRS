// GET — the parent's inbox: broadcasts they're a recipient of, with read status,
// cursor-paginated. Membership comes from BroadcastRecipient rows created at send.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { getInbox } from "@/lib/broadcast";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const { searchParams } = new URL(request.url);
  const result = await getInbox(auth.id, searchParams.get("cursor") ?? undefined);
  return NextResponse.json(result);
}
