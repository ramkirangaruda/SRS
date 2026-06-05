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
export type IconName =
  | "dashboard"
  | "students"
  | "staff"
  | "children"
  | "settings"
  | "fees"
  | "attendance"
  | "homework"
  | "diary"
  | "broadcast"
  | "messages"
  | "feedback"
  | "events"
  | "holidays"
  | "meals"
  | "gallery"
  | "videos"
  | "elearning";

export type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

// One menu per role. Add/remove items here and both navs update automatically.
export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  [ROLES.PRINCIPAL]: [
    { label: "Dashboard", href: "/dashboard/principal", icon: "dashboard" },
    { label: "Students", href: "/principal/students", icon: "students" },
    { label: "Fees", href: "/principal/fees", icon: "fees" },
    { label: "Attendance", href: "/principal/attendance", icon: "attendance" },
    { label: "Homework", href: "/principal/homework", icon: "homework" },
    { label: "Diary", href: "/principal/diary", icon: "diary" },
    { label: "Broadcast", href: "/principal/broadcast", icon: "broadcast" },
    { label: "Feedback", href: "/principal/feedback", icon: "feedback" },
    { label: "Events", href: "/principal/events", icon: "events" },
    { label: "Holidays", href: "/principal/holidays", icon: "holidays" },
    { label: "Meals", href: "/principal/meals", icon: "meals" },
    { label: "Gallery", href: "/principal/gallery", icon: "gallery" },
    { label: "Videos", href: "/principal/videos", icon: "videos" },
    { label: "E-Learning", href: "/principal/elearning", icon: "elearning" },
    { label: "Staff", href: "/dashboard/principal/staff", icon: "staff" },
    { label: "Settings", href: "/dashboard/principal/settings", icon: "settings" },
  ],
  [ROLES.TEACHER]: [
    { label: "Dashboard", href: "/dashboard/teacher", icon: "dashboard" },
    { label: "Students", href: "/dashboard/teacher/students", icon: "students" },
    { label: "Settings", href: "/dashboard/teacher/settings", icon: "settings" },
  ],
  [ROLES.PARENT]: [
    { label: "Dashboard", href: "/dashboard/parent", icon: "dashboard" },
    { label: "Children", href: "/parent/children", icon: "children" },
    { label: "Fees", href: "/parent/fees", icon: "fees" },
    { label: "Attendance", href: "/parent/attendance", icon: "attendance" },
    { label: "Homework", href: "/parent/homework", icon: "homework" },
    { label: "Diary", href: "/parent/diary", icon: "diary" },
    { label: "Messages", href: "/parent/messages", icon: "messages" },
    { label: "Feedback", href: "/parent/feedback", icon: "feedback" },
    { label: "Events", href: "/parent/events", icon: "events" },
    { label: "Holidays", href: "/parent/holidays", icon: "holidays" },
    { label: "Meals", href: "/parent/meals", icon: "meals" },
    { label: "Gallery", href: "/parent/gallery", icon: "gallery" },
    { label: "Videos", href: "/parent/videos", icon: "videos" },
    { label: "Learning", href: "/parent/elearning", icon: "elearning" },
    { label: "Settings", href: "/dashboard/parent/settings", icon: "settings" },
  ],
};
