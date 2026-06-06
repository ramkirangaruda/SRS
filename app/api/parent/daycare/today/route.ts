// Parent: today's daycare log(s) for their daycare children + status.
// Supports lightweight polling: pass ?since=<ISO> and if nothing changed we
// return { changed: false } so the client skips re-rendering.
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/api-auth";
import { ROLES } from "@/lib/roles";
import { parentToday } from "@/lib/daycare";

export async function GET(request: Request) {
  const auth = await requireRole(ROLES.PARENT);
  if (auth instanceof NextResponse) return auth;
  const data = await parentToday(auth.id, auth.schoolId);
  const since = new URL(request.url).searchParams.get("since");
  // CHEAP POLL: only the lastUpdated marker is compared; unchanged → tiny payload.
  if (since && data.lastUpdated && since === data.lastUpdated) {
    return NextResponse.json({ changed: false, lastUpdated: data.lastUpdated });
  }
  return NextResponse.json({ changed: true, ...data });
}
