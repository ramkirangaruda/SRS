// The shared app shell: desktop sidebar + mobile header + mobile bottom nav,
// wrapping the page content. Used by every authenticated section's layout
// (/dashboard, /principal, /parent) so the chrome is defined in ONE place.
//
// This is a Server Component. It reads the session, enforces the required role
// (defense-in-depth on top of middleware.ts), and feeds the nav components.
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isRole, ROLE_HOME, type Role } from "@/lib/roles";
import { NAV_BY_ROLE } from "@/lib/nav";
import { getUnreadCounts } from "@/lib/notifications";
import { UnreadProvider } from "@/components/unread-provider";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";

type AppShellProps = {
  children: React.ReactNode;
  // If provided, only this role may view the section; others go to their own home.
  // If omitted (the /dashboard case), any valid logged-in role is allowed.
  requiredRole?: Role;
};

export async function AppShell({ children, requiredRole }: AppShellProps) {
  const session = await getServerSession(authOptions);

  // No valid session/role at all → login.
  if (!session?.user || !isRole(session.user.role)) {
    redirect("/login");
  }

  const role = session.user.role;

  // Wrong role for this section → send them to their own home (mirrors middleware).
  if (requiredRole && role !== requiredRole) {
    redirect(ROLE_HOME[role]);
  }

  const navItems = NAV_BY_ROLE[role];
  // Human-friendly label, e.g. "PRINCIPAL" -> "Principal".
  const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();
  const userName = session.user.name ?? session.user.email ?? "User";

  // Initial unread counts for the nav badges (kept fresh client-side by polling).
  const unread = await getUnreadCounts({ id: session.user.id, role, schoolId: session.user.schoolId });

  return (
    // UnreadProvider exposes the counts to Sidebar/BottomNav for the badges.
    <UnreadProvider initial={unread}>
      <div className="flex min-h-screen">
        {/* Desktop: sidebar on the left. Hidden on mobile (md:flex inside). */}
        <Sidebar items={navItems} userName={userName} roleLabel={roleLabel} />

        <div className="flex flex-1 flex-col">
          {/* Mobile: top bar with brand + sign out. Hidden on desktop. */}
          <MobileHeader userName={userName} />

          {/* Page content. pb-20 leaves room above the mobile bottom nav. */}
          <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8">{children}</main>
        </div>

        {/* Mobile: bottom nav. Hidden on desktop. */}
        <BottomNav items={navItems} />
      </div>
    </UnreadProvider>
  );
}
