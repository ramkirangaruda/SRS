// Change own password (any role). Verifies the current password, enforces the
// strength policy, hashes the new one, and bumps passwordChangedAt — which
// invalidates this user's tokens on OTHER devices. The current device calls
// session update() afterward to re-stamp its own token and stay logged in.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { changePassword } from "@/lib/settings";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const b = body as { currentPassword?: string; newPassword?: string; confirmPassword?: string };
  if (!b.currentPassword || !b.newPassword) return NextResponse.json({ error: "Current and new password are required" }, { status: 422 });
  if (b.newPassword !== b.confirmPassword) return NextResponse.json({ error: "New passwords do not match" }, { status: 422 });

  const result = await changePassword(session.user.id, b.currentPassword, b.newPassword);
  if (result === "wrong") return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  if (result === "weak") return NextResponse.json({ error: "Password must be 8+ chars with upper, lower and a number" }, { status: 422 });
  return NextResponse.json({ ok: true });
}
