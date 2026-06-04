// Layout for the /principal section (student management, etc.). We pin
// requiredRole to PRINCIPAL so the shell redirects any non-principal away — a
// second layer of defense on top of middleware.ts.
import { AppShell } from "@/components/layout/app-shell";
import { ROLES } from "@/lib/roles";

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
  return <AppShell requiredRole={ROLES.PRINCIPAL}>{children}</AppShell>;
}
