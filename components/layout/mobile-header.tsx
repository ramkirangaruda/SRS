// A simple top bar shown only on mobile (md:hidden). The bottom nav handles
// section navigation, so this just shows the brand + a sign-out action, which
// wouldn't otherwise fit in the bottom bar.
"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { NotificationBell } from "@/components/layout/notification-bell";

export function MobileHeader({ userName }: { userName: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-4 md:hidden print:hidden">
      <span className="text-base font-bold">SchoolSync</span>
      <div className="flex items-center gap-1">
        <NotificationBell />
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1 p-2 text-sm text-muted-foreground"
          aria-label={`Sign out ${userName}`}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
