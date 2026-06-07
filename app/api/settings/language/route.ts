// Save the user's language preference. Persists to User.locale (follows them on
// any device) AND sets the `locale` cookie (which i18n/request.ts reads for SSR).
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SUPPORTED_LOCALES } from "@/i18n/locales";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  const locale = (body as { locale?: string }).locale;
  if (!locale || !(SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
    return NextResponse.json({ error: "Unsupported locale" }, { status: 422 });
  }

  await prisma.user.update({ where: { id: session.user.id }, data: { locale } });
  const res = NextResponse.json({ ok: true, locale });
  // 1 year, readable by the server config (httpOnly not needed — it's not secret).
  res.cookies.set("locale", locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  return res;
}
