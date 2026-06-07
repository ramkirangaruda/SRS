// Change Language. Saves to User.locale + cookie, then router.refresh() re-runs
// the server layout which re-reads the cookie and re-renders in the new language
// — no full page reload.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";
import { SUPPORTED_LOCALES, LOCALE_NAMES } from "@/i18n/locales";
import { cn } from "@/lib/utils";

export function LanguageSection({ currentLocale }: { currentLocale: string }) {
  const t = useTranslations("settings.language");
  const router = useRouter();
  const [locale, setLocale] = useState(currentLocale);
  const [pending, startTransition] = useTransition();

  async function pick(l: string) {
    setLocale(l);
    const res = await fetch("/api/settings/language", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ locale: l }) });
    if (!res.ok) { toast.error("Failed"); return; }
    toast.success(t("saved"));
    // Refresh server components so SSR re-reads the cookie → new language renders.
    startTransition(() => router.refresh());
  }

  return (
    <div className="max-w-md space-y-3">
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {SUPPORTED_LOCALES.map((l) => (
          <button key={l} onClick={() => pick(l)} disabled={pending} className={cn("flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted", locale === l && "border-primary bg-primary/5")}>
            {LOCALE_NAMES[l]}
            {locale === l && <Check className="h-4 w-4 text-primary" />}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">Only English and Hindi are fully translated; others fall back to English.</p>
    </div>
  );
}
