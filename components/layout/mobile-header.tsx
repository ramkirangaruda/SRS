// A simple top bar shown only on mobile (md:hidden). The bottom nav handles
// section navigation, so this just shows the brand + a sign-out action, which
// wouldn't otherwise fit in the bottom bar.
"use client";

import { NotificationBell } from "@/components/layout/notification-bell";
import { MobileNav } from "@/components/layout/mobile-nav";
import type { NavItem } from "@/lib/nav";

export function MobileHeader({ items, roleLabel }: { items: NavItem[]; roleLabel: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-card px-2 md:hidden print:hidden">
      {/* Hamburger opens the full vertical module drawer. */}
      <div className="flex items-center gap-1">
        <MobileNav items={items} roleLabel={roleLabel} />
        <span className="text-base font-bold">SchoolSync</span>
      </div>
      <NotificationBell />
    </header>
  );
}
