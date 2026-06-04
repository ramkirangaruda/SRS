// This is the API endpoint NextAuth needs to function.
//
// The folder name `[...nextauth]` is a "catch-all" route: it matches every URL
// under /api/auth/* (e.g. /api/auth/signin, /api/auth/callback, /api/auth/session).
// NextAuth handles all of them internally — we just wire it up here.
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// In the App Router, an API route exports functions named after HTTP methods.
// NextAuth needs to respond to both GET and POST, so we export the same handler
// for both.
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
