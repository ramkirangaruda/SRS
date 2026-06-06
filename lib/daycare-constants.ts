// Pure daycare display constants (no "use client", no prisma) — safe to import
// from BOTH server components (the print page) and client components. Keeping
// MOOD_META here is what lets the server-rendered PDF page read mood.emoji
// without "dotting into a client module".
export const MOOD_META: Record<string, { emoji: string; label: string; color: string }> = {
  HAPPY: { emoji: "😊", label: "Happy", color: "bg-emerald-100 border-emerald-400" },
  OKAY: { emoji: "😐", label: "Okay", color: "bg-amber-100 border-amber-400" },
  UPSET: { emoji: "😢", label: "Upset", color: "bg-orange-100 border-orange-400" },
  SICK: { emoji: "🤒", label: "Sick", color: "bg-red-100 border-red-400" },
};
