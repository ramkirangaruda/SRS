// Client-side context providers for the whole app.
//
// NextAuth's `useSession()` hook (used by our layout/logout button) needs a
// <SessionProvider> ancestor. Providers must run in the browser, so this file
// is a Client Component ("use client"). We keep it separate from the root
// layout so the layout itself can stay a Server Component.
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
