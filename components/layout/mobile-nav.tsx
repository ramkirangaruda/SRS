// MOBILE navigation drawer. A hamburger button (shown only on mobile) opens a
// left slide-over Sheet containing the FULL vertical module list — icons, labels,
// unread badges, active highlight — so every module is reachable without cramming
// them into a tiny bottom bar. Tapping a link closes the drawer.
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/lib/nav";
import { NAV_ICONS } from "@/components/layout/nav-icons";
import { useUnread } from "@/components/unread-provider";
import { unreadForHref, NavBadge } from "@/components/layout/nav-badge";
import { LogoutButton } from "@/components/layout/logout-button";
import { BranchSwitcher } from "@/components/layout/branch-switcher";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

export function MobileNav({
  items,
  roleLabel,
  branches,
  currentBranchId,
}: {
  items: NavItem[];
  roleLabel: string;
  branches: { id: string; name: string }[];
  currentBranchId: string;
}) {
  const pathname = usePathname();
  const unread = useUnread();
  const [open, setOpen] = useState(false);
  const homeHref = `/dashboard/${roleLabel.toLowerCase()}`;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button aria-label="Open menu" className="rounded-md p-2 hover:bg-muted">
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      {/* Left drawer, scrollable so all modules fit on any phone height. */}
      <SheetContent side="left" className="w-72 overflow-y-auto p-0">
        <div className="flex h-14 items-center border-b px-4">
          <SheetTitle className="text-base font-bold">SchoolSync</SheetTitle>
        </div>
        {/* Branch switcher (principal with 2+ branches). */}
        {branches.length >= 2 && (
          <div className="border-b p-3">
            <BranchSwitcher branches={branches} currentBranchId={currentBranchId} />
          </div>
        )}
        <nav className="space-y-1 p-3">
          {items.map((item) => {
            const active = pathname === item.href || (item.href !== homeHref && pathname.startsWith(item.href));
            const Icon = NAV_ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <NavBadge count={unreadForHref(item.href, unread)} />
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <LogoutButton />
        </div>
      </SheetContent>
    </Sheet>
  );
}
