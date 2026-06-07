// Remove a Web Push subscription (user disabled notifications on this device).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const endpoint = (body as { endpoint?: string }).endpoint;
  if (!endpoint) return NextResponse.json({ error: "endpoint required" }, { status: 422 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: session.user.id } });
  return NextResponse.json({ ok: true });
}
