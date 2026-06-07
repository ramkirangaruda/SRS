// Pure locale constants (no next/headers, no server imports) — safe to import in
// BOTH client and server code. The server request config and the language API +
// the client language picker all share these.
export const SUPPORTED_LOCALES = ["en", "hi", "kn", "ta", "te", "ml", "bn", "mr", "gu"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_NAMES: Record<string, string> = {
  en: "English", hi: "हिन्दी", kn: "ಕನ್ನಡ", ta: "தமிழ்", te: "తెలుగు", ml: "മലയാളം", bn: "বাংলা", mr: "मराठী", gu: "ગુજરાતી",
};
