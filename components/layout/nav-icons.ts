// Maps the string icon names from lib/nav.ts to actual lucide icon components.
// This module is imported only by Client Components (Sidebar, BottomNav), so
// keeping the actual components here — not in the nav config — is what avoids
// passing functions across the server→client boundary.
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Settings,
  Wallet,
  CalendarCheck,
  BookOpen,
  NotebookPen,
  Megaphone,
  Mail,
  MessageSquare,
  CalendarRange,
  Palmtree,
  UtensilsCrossed,
  Images,
  Film,
  Library,
  FileBarChart2,
  Award,
  CalendarClock,
  MonitorPlay,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "@/lib/nav";

// Record<IconName, ...> forces this map to cover every IconName — add a new name
// in nav.ts and TypeScript makes you register its icon here.
export const NAV_ICONS: Record<IconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  students: GraduationCap,
  staff: Users,
  children: GraduationCap,
  settings: Settings,
  fees: Wallet,
  attendance: CalendarCheck,
  homework: BookOpen,
  diary: NotebookPen,
  broadcast: Megaphone,
  messages: Mail,
  feedback: MessageSquare,
  events: CalendarRange,
  holidays: Palmtree,
  meals: UtensilsCrossed,
  gallery: Images,
  videos: Film,
  elearning: Library,
  testreports: FileBarChart2,
  reports: Award,
  timetable: CalendarClock,
  virtualclassroom: MonitorPlay,
};
