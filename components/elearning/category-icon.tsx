// Maps a stored icon key to a lucide icon (client-side, like nav-icons). Keeps
// the DB value a simple string while the UI renders a real component.
import { Beaker, Calculator, BookOpen, Palette, Music, Trophy, Globe, type LucideIcon } from "lucide-react";

export const CATEGORY_ICONS: { key: string; label: string }[] = [
  { key: "beaker", label: "Science" },
  { key: "calculator", label: "Math" },
  { key: "book", label: "English" },
  { key: "palette", label: "Art" },
  { key: "music", label: "Music" },
  { key: "trophy", label: "Sports" },
  { key: "globe", label: "General" },
];

export const CATEGORY_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

const MAP: Record<string, LucideIcon> = { beaker: Beaker, calculator: Calculator, book: BookOpen, palette: Palette, music: Music, trophy: Trophy, globe: Globe };

export function CategoryIcon({ icon, className }: { icon: string | null; className?: string }) {
  const Icon = (icon && MAP[icon]) || Globe;
  return <Icon className={className} />;
}
