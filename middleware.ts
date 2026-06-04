// Role-based access control. This middleware runs on the SERVER for every
// request matching the `config.matcher` below, BEFORE the page renders. It's
// our single checkpoint deciding who may see what.
//
// We use NextAuth's `withAuth` wrapper, which reads the JWT cookie for us and
// exposes the token (with our custom `role`) on `req.nextauth.token`.
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { ROLES, ROLE_HOME } from "@/lib/roles";

export default withAuth(
  // This function only runs AFTER the user is confirmed logged in (see the
  // `authorized` callback below). Here we enforce role-specific rules.
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;
    const role = token?.role;

    // Guard the PRINCIPAL area: only principals may enter.
    if (pathname.startsWith("/dashboard/principal") && role !== ROLES.PRINCIPAL) {
      // A parent trying to reach the principal area gets bounced to THEIR home.
      return NextResponse.redirect(new URL(ROLE_HOME.PARENT, req.url));
    }

    // Guard the PARENT area: only parents may enter.
    if (pathname.startsWith("/dashboard/parent") && role !== ROLES.PARENT) {
      return NextResponse.redirect(new URL(ROLE_HOME.PRINCIPAL, req.url));
    }

    // Bare /dashboard: send each role to its own home so nobody sees a blank page.
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      const home = role === ROLES.PRINCIPAL ? ROLE_HOME.PRINCIPAL : ROLE_HOME.PARENT;
      return NextResponse.redirect(new URL(home, req.url));
    }

    // No rule blocked them — let the request through.
    return NextResponse.next();
  },
  {
    // withAuth has its OWN pages config (separate from lib/auth.ts). Without
    // this, unauthenticated users get sent to NextAuth's default sign-in page
    // at /api/auth/signin instead of our custom /login.
    pages: { signIn: "/login" },
    callbacks: {
      // This runs FIRST. Returning false means "not logged in" → NextAuth
      // automatically redirects to our /login page (configured just above).
      // Returning true means "logged in" → the middleware function above runs.
      authorized: ({ token }) => !!token,
    },
  }
);

// The matcher limits which paths trigger this middleware. We only protect
// /dashboard/* — the login page and public assets stay open. (Note: list the
// paths as static patterns; Next compiles this at build time.)
export const config = {
  matcher: ["/dashboard/:path*"],
};
