// Change own password (any role). Verifies the current password, enforces the
// strength policy, hashes the new one, and bumps passwordChangedAt — which
// invalidates this user's tokens on OTHER devices. The current device calls
// session update() afterward to re-stamp its own token and stay logged in.
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { changePassword } from "@/lib/settings";

const schema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(1, "Confirm password is required"),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 422 });
  }
  const { currentPassword, newPassword, confirmPassword } = parsed.data;
  if (newPassword !== confirmPassword) {
    return NextResponse.json({ error: "New passwords do not match" }, { status: 422 });
  }

  const result = await changePassword(session.user.id, currentPassword, newPassword);
  if (result === "wrong") return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
  if (result === "weak") return NextResponse.json({ error: "Password must be 8+ chars with upper, lower and a number" }, { status: 422 });
  return NextResponse.json({ ok: true });
}
