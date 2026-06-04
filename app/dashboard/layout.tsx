// The shared shell for EVERY page under /dashboard. Because it's a layout, it
// renders ONCE and persists while you navigate between dashboard pages — the
// sidebar/bottom-nav don't re-mount or flicker.
//
// This is a Server Component, so we can securely read the session here. Note:
// middleware.ts already guarantees only logged-in users reach this point; this
// is a second, defense-in-depth check.
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isRole } from "@/lib/roles";
import { NAV_BY_ROLE } from "@/lib/nav";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomNav } from "@/components/layout/bottom-nav";
import { MobileHeader } from "@/components/layout/mobile-header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Belt-and-suspenders: if somehow there's no valid session/role, go to login.
  if (!session?.user || !isRole(session.user.role)) {
    redirect("/login");
  }

  const role = session.user.role;
  const navItems = NAV_BY_ROLE[role];
  // Human-friendly role label, e.g. "PRINCIPAL" -> "Principal".
  const roleLabel = role.charAt(0) + role.slice(1).toLowerCase();
  const userName = session.user.name ?? session.user.email ?? "User";

  return (
    <div className="flex min-h-screen">
      {/* Desktop: sidebar on the left. Hidden on mobile. */}
      <Sidebar items={navItems} userName={userName} roleLabel={roleLabel} />

      {/* Main column */}
      <div className="flex flex-1 flex-col">
        {/* Mobile: top bar with brand + sign out. Hidden on desktop. */}
        <MobileHeader userName={userName} />

        {/* The actual page content. pb-20 leaves room above the mobile bottom nav. */}
        <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8">{children}</main>
      </div>

      {/* Mobile: bottom nav. Hidden on desktop. */}
      <BottomNav items={navItems} />
    </div>
  );
}
