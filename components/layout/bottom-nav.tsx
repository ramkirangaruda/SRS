// The MOBILE bottom navigation bar. It's a fixed bar at the bottom of the
// screen, shown only on small screens (`md:hidden`) — the classic mobile-app
// pattern. On desktop the sidebar replaces it.
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";
import { NAV_ICONS } from "@/components/layout/nav-icons";

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t bg-card md:hidden">
      <div className="flex h-16 items-stretch justify-around">
        {items.map((item) => {
          const active =
            pathname === item.href ||
            (item.href.split("/").length > 3 && pathname.startsWith(item.href));
          const Icon = NAV_ICONS[item.icon];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 text-xs",
                active ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="leading-none">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
