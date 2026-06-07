// NextAuth configuration. This is where login is verified and where we stamp
// the user's role into the session so the rest of the app can trust it.
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { isRole, ROLES } from "@/lib/roles";

// Validate the shape of what the login form sends BEFORE touching the database.
// zod gives us a runtime guarantee that email/password are present and valid.
const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  // We use JWT sessions: the session lives in a signed, HTTP-only cookie rather
  // than a database table. Simpler, and works great with the Credentials provider.
  session: { strategy: "jwt" },

  // Our custom login page lives at /login (instead of NextAuth's default page).
  pages: { signIn: "/login" },

  providers: [
    CredentialsProvider({
      name: "Credentials",
      // These fields are mostly informational here since we render our own form.
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      // authorize() is the gatekeeper. Return a user object to log in, or null
      // to reject. NEVER throw raw DB errors here — that can leak information.
      async authorize(rawCredentials) {
        // 1. Validate input shape.
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // 2. Look up the user by their unique email.
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return null;

        // 3. Compare the typed password against the stored bcrypt hash (the
        //    `password` column holds the hash). bcrypt re-hashes the input with
        //    the same salt and checks for a match — the original is never decrypted.
        const passwordValid = await bcrypt.compare(password, user.password);
        if (!passwordValid) return null;

        // 3b. Deactivated accounts cannot log in. This is what makes "soft
        //     deactivation" a real security boundary: a resigned teacher's row
        //     (and all their historical references) is kept, but isActive=false
        //     blocks the login here. Without this check, deactivation is cosmetic.
        if (!user.isActive) return null;

        // 3c. Record the login time (for the "active users" share stats). Fire and
        //     forget — a failure here must not block a valid login.
        prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

        // 4. Safety net: ensure the stored role is one we recognize.
        const role = isRole(user.role) ? user.role : ROLES.PARENT;

        // 5. Whatever we return becomes the seed for the JWT (see jwt callback).
        //    We intentionally do NOT return the password hash. We DO include
        //    schoolId so every later query can be scoped to this user's school.
        return { id: user.id, email: user.email, name: user.name, role, schoolId: user.schoolId };
      },
    }),
  ],

  // Callbacks let us shape the token and session. This is how the role travels
  // from the database all the way to the browser session.
  callbacks: {
    // Runs whenever a JWT is created (at login) or updated. On login, `user` is
    // the object returned by authorize(); we copy its id + role onto the token.
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.schoolId = (user as { schoolId: string }).schoolId;
        // Stamp when THIS token was issued — compared against passwordChangedAt.
        token.loginAt = Date.now();
      }
      // On an explicit session.update() (e.g. right after the user changes their
      // OWN password), re-stamp loginAt so THIS device stays logged in while every
      // OTHER device (older loginAt) is invalidated by the check below.
      if (trigger === "update" && token.id) token.loginAt = Date.now();
      // SESSION INVALIDATION (runs on every server-side session read): if the
      // user changed their password (or was deactivated) AFTER this token was
      // issued, the token is stale → return an EMPTY token so the session has no
      // user. We do the check here (Node) rather than edge middleware because
      // Prisma can't run on the edge. Cost: one indexed lookup per session read.
      if (token.id) {
        const u = await prisma.user.findUnique({ where: { id: token.id as string }, select: { isActive: true, passwordChangedAt: true } });
        if (!u || !u.isActive) return {};
        if (u.passwordChangedAt && typeof token.loginAt === "number" && u.passwordChangedAt.getTime() > token.loginAt) return {};
      }
      return token;
    },
    // Runs whenever a session is read. We expose the id + role from the token onto
    // `session.user`. A stale/empty token (no id) yields a session with no user,
    // which the AppShell treats as "not logged in" → redirect to /login.
    async session({ session, token }) {
      if (!token?.id) {
        // @ts-expect-error — intentionally clear the user on an invalidated token.
        session.user = undefined;
        return session;
      }
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.schoolId = token.schoolId as string;
      }
      return session;
    },
  },
};
