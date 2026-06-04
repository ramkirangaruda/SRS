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
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }

  // The object returned from authorize() — we added `role`.
  interface User {
    role: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
  }
}
