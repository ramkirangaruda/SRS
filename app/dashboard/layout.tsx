// Layout for every page under /dashboard. Any logged-in role may view their own
// dashboard, so we don't pin a requiredRole here — the AppShell just enforces
// "must be logged in." Role-specific dashboards live in their own subfolders.
import { AppShell } from "@/components/layout/app-shell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
