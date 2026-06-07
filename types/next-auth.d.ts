// TypeScript "declaration merging" to teach NextAuth about our custom fields.
//
// By default, NextAuth's Session/User/JWT types don't know about `id` or `role`.
// This file extends those built-in types so that `session.user.role` is fully
// typed everywhere — no `any`, no red squiggles.
import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      schoolId: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  // The object returned from authorize() — we added `role` and `schoolId`.
  interface User {
    role: string;
    schoolId: string;
  }
}

declare module "next-auth/jwt" {
  // Fields are optional so an invalidated token can be represented as `{}`
  // (see the jwt callback in lib/auth.ts).
  interface JWT {
    id?: string;
    role?: string;
    schoolId?: string;
    loginAt?: number; // ms epoch when this token was issued
  }
}
