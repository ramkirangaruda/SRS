// Server-side logout.
//
// With stateless JWT sessions there's no server row to delete, so "logout" is
// really "stop trusting the cookie". The client calls next-auth `signOut()` which
// clears the session cookie (client-side logout). This endpoint is the
// server-side counterpart: it expires the session cookies in the response, so
// even a programmatic logout (without the client helper) drops the token.
//
// (If we ever needed to kill a token that's ALREADY been copied elsewhere, that's
// what the passwordChangedAt mechanism in lib/auth.ts is for — a denylist isn't
// needed.)
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  // Clear both the secure and non-secure cookie names NextAuth may have set.
  for (const name of ["next-auth.session-token", "__Secure-next-auth.session-token"]) {
    res.cookies.set(name, "", { path: "/", expires: new Date(0) });
  }
  return res;
}
