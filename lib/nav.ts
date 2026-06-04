// Navigation definitions, kept in one place so the desktop sidebar and the
// mobile bottom nav always show the SAME items for a given role. Each role sees
// a different menu.
//
// IMPORTANT: we store the icon as a STRING name, not the icon component itself.
// The dashboard layout is a Server Component and passes these items as props to
// Client Components (Sidebar/BottomNav). React can't serialize a function across
// that server→client boundary, so the client components map the name to a real
// lucide icon (see components/layout/nav-icons.ts).
import { ROLES, type Role } from "@/lib/roles";

// The set of icon names our nav can use. Using a union type means a typo here
// is a compile error, and nav-icons.ts is forced to handle every name.
export type IconName = "dashboard" | "students" | "staff" | "children" | "settings";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

// One menu per role. Add/remove items here and both navs update automatically.
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  [ROLES.PRINCIPAL]: [
    { label: "Dashboard", href: "/dashboard/principal", icon: "dashboard" },
    { label: "Students", href: "/dashboard/principal/students", icon: "students" },
    { label: "Staff", href: "/dashboard/principal/staff", icon: "staff" },
    { label: "Settings", href: "/dashboard/principal/settings", icon: "settings" },
  ],
  [ROLES.PARENT]: [
    { label: "Dashboard", href: "/dashboard/parent", icon: "dashboard" },
    { label: "Children", href: "/dashboard/parent/children", icon: "children" },
    { label: "Settings", href: "/dashboard/parent/settings", icon: "settings" },
  ],
};
