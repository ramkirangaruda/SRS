// In-app notifications list (bell dropdown). Any logged-in role.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listNotifications } from "@/lib/notifications-center";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const page = Number(new URL(request.url).searchParams.get("page") ?? 1);
  return NextResponse.json(await listNotifications(session.user.id, page));
}
