// next-intl request configuration (cookie-based locale, no URL routing).
//
// This runs on the SERVER for every request. It reads the `locale` cookie (set
// when the user picks a language), loads that locale's message JSON, and hands
// both to next-intl. Because it's server-side, SSR renders in the right language
// too — no English flash before hydration. Falls back to English for an unknown
// or missing cookie.
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE, type Locale } from "@/i18n/locales";

export default getRequestConfig(async () => {
  const cookieLocale = cookies().get("locale")?.value;
  const locale: Locale = (SUPPORTED_LOCALES as readonly string[]).includes(cookieLocale ?? "")
    ? (cookieLocale as Locale)
    : DEFAULT_LOCALE;

  // We ship full English + Hindi dictionaries; any locale without its own file
  // falls back to English so the app never shows raw keys.
  let messages: Record<string, unknown>;
  try {
    messages = (await import(`../messages/${locale}.json`)).default;
  } catch {
    messages = (await import("../messages/en.json")).default;
  }
  return { locale, messages };
});
