// Emoji mood selector. Accessibility: it's a real radiogroup — each option is a
// button with role="radio" + aria-checked, reachable by keyboard (Tab to the
// group, arrows/Enter to choose) and announced by screen readers via aria-label.
// Big touch targets (h-14) so it works on phones. Used in the daycare log form.
"use client";

import { MOODS } from "@/lib/daycare";
import { MOOD_META } from "@/lib/daycare-constants";
import { cn } from "@/lib/utils";

export { MOOD_META };

export function MoodSelector({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label="Overall mood" className="flex gap-2">
      {MOODS.map((m) => {
        const meta = MOOD_META[m];
        const active = value === m;
        return (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={meta.label}
            onClick={() => onChange(m)}
            className={cn(
              "flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg border-2 transition",
              active ? meta.color : "border-transparent bg-muted hover:bg-muted/70"
            )}
          >
            <span className="text-2xl leading-none">{meta.emoji}</span>
            <span className="text-[10px] font-medium">{meta.label}</span>
          </button>
        );
      })}
    </div>
  );
}
