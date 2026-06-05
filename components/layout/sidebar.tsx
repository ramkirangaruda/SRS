// The DESKTOP sidebar. It's hidden on small screens (`hidden md:flex`) and the
// bottom nav takes over there instead.
//
// It's a Client Component because it uses usePathname() to highlight the active
// link as you navigate.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { LogoutButton } from "@/components/layout/logout-button";
import { useUnread } from "@/components/unread-provider";
import { unreadForHref, NavBadge } from "@/components/layout/nav-badge";

type SidebarProps = {
  items: NavItem[];
  userName: string;
  roleLabel: string;
};

export function Sidebar({ items, userName, roleLabel }: SidebarProps) {
  const pathname = usePathname();
  const unread = useUnread();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex print:hidden">
      {/* Brand header */}
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-bold">SchoolSync</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1 p-4">
        {items.map((item) => {
          // Highlight the link whose href matches the current URL. We treat the
          // exact dashboard root specially so it isn't "active" on sub-pages.
          const active =
            pathname === item.href ||
            (item.href !== `/dashboard/${roleLabel.toLowerCase()}` &&
              pathname.startsWith(item.href));
          // Resolve the string icon name to its lucide component (client-side).
          const Icon = NAV_ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
              <NavBadge count={unreadForHref(item.href, unread)} />
            </Link>
          );
        })}
      </nav>

      {/* User info + sign out, pinned to the bottom */}
      <div className="border-t p-4">
        <div className="mb-2 px-3">
          <p className="truncate text-sm font-medium">{userName}</p>
          <p className="text-xs text-muted-foreground">{roleLabel}</p>
        </div>
        <LogoutButton />
      </div>
    </aside>
  );
}
