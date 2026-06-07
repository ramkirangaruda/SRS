// Client-side context providers for the whole app.
//
// NextAuth's `useSession()` hook (used by our layout/logout button) needs a
// <SessionProvider> ancestor. Providers must run in the browser, so this file
// is a Client Component ("use client"). We keep it separate from the root
// layout so the layout itself can stay a Server Component.
"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      {/* Global toast host. Components call toast.success(...) from anywhere and
          the notification renders here (e.g. "Marked attendance for 32 students"). */}
      <Toaster richColors position="top-center" />
      {/* Custom PWA install banner (shows after a few visits, if installable). */}
      <InstallPrompt />
    </SessionProvider>
  );
}
