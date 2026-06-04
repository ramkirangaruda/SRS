// Authentication/authorization helpers for API route handlers.
//
// HOW THE AUTH CHECK WORKS:
// Every API route is a public HTTP endpoint — anyone can hit it with curl, not
// just our UI. So each handler must independently verify the caller. We read the
// session from the request's cookie via getServerSession(authOptions). NextAuth
// validates the cookie's signature and decrypts the JWT, giving us a trustworthy
// { id, role, schoolId }. We then check the role. If anything fails we return an
// HTTP error Response (401 = not logged in, 403 = logged in but wrong role) and
// the handler stops there — the database is never touched.
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { type Role } from "@/lib/roles";

// The trustworthy identity we hand back to routes once a caller is authorized.
export type AuthedUser = {
  id: string;
  role: string;
  schoolId: string;
  name?: string | null;
  email?: string | null;
};

// Returns the authorized user, OR a NextResponse error to return immediately.
// Usage in a route:
//   const auth = await requireRole(ROLES.PRINCIPAL);
//   if (auth instanceof NextResponse) return auth;   // not allowed -> stop
//   // ...auth is now the AuthedUser, safe to proceed
export async function requireRole(role: Role): Promise<AuthedUser | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    id: session.user.id,
    role: session.user.role,
    schoolId: session.user.schoolId,
    name: session.user.name,
    email: session.user.email,
  };
}

// Like requireRole, but accepts ANY of several roles. Attendance, for example,
// is markable by both PRINCIPAL and TEACHER, so its routes use this.
export async function requireAnyRole(roles: Role[]): Promise<AuthedUser | NextResponse> {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!roles.includes(session.user.role as Role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return {
    id: session.user.id,
    role: session.user.role,
    schoolId: session.user.schoolId,
    name: session.user.name,
    email: session.user.email,
  };
}
