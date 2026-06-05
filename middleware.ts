// Role-based access control. This middleware runs on the SERVER for every
// request matching the `config.matcher` below, BEFORE the page renders. It's
// our single checkpoint deciding who may see what.
//
// We use NextAuth's `withAuth` wrapper, which reads the JWT cookie for us and
// exposes the token (with our custom `role`) on `req.nextauth.token`.
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { ROLES, ROLE_HOME, isRole } from "@/lib/roles";

export default withAuth(
  // This function only runs AFTER the user is confirmed logged in (see the
  // `authorized` callback below). Here we enforce role-specific rules.
  function middleware(req) {
    const { token } = req.nextauth;
    const { pathname } = req.nextUrl;
    const role = token?.role;

    // The fallback home to bounce a wrong-role user to: their OWN home if we
    // know their role, otherwise the login page.
    const ownHome = role && isRole(role) ? ROLE_HOME[role] : "/login";

    // Guard the PRINCIPAL areas: only principals may enter. We protect both the
    // principal dashboard and the new top-level /principal section (students…).
    if (
      (pathname.startsWith("/dashboard/principal") || pathname.startsWith("/principal")) &&
      role !== ROLES.PRINCIPAL
    ) {
      return NextResponse.redirect(new URL(ownHome, req.url));
    }

    // Guard the PARENT areas: only parents may enter.
    if (
      (pathname.startsWith("/dashboard/parent") || pathname.startsWith("/parent")) &&
      role !== ROLES.PARENT
    ) {
      return NextResponse.redirect(new URL(ownHome, req.url));
    }

    // Bare /dashboard: send each role to its own home so nobody sees a blank page.
    // Using ROLE_HOME by role keeps this correct as we add roles (e.g. TEACHER).
    if (pathname === "/dashboard" || pathname === "/dashboard/") {
      const home = role && isRole(role) ? ROLE_HOME[role] : "/login";
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
  // /print/* (report cards) just needs a logged-in user; the page itself does the
  // role/ownership check, so it isn't under /principal or /parent.
  matcher: ["/dashboard/:path*", "/principal/:path*", "/parent/:path*", "/print/:path*"],
};
