// Layout for the /parent section (my children). Pinned to the PARENT role.
import { AppShell } from "@/components/layout/app-shell";
import { ROLES } from "@/lib/roles";

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredRole={ROLES.PARENT}>{children}</AppShell>;
}
