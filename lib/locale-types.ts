export const SUPPORTED_LOCALES = ["it", "en", "de", "fr", "es"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type LanguagePreference = "system" | SupportedLocale;

export const DEFAULT_LOCALE: SupportedLocale = "it";

export function isSupportedLocale(value: unknown): value is SupportedLocale {
  return (
    typeof value === "string" &&
    SUPPORTED_LOCALES.includes(value as SupportedLocale)
  );
}

export function isLanguagePreference(
  value: unknown,
): value is LanguagePreference {
  return value === "system" || isSupportedLocale(value);
}

export function normalizeLocale(
  value: string | null | undefined,
): SupportedLocale | null {
  if (!value) return null;
  const language = value.toLowerCase().split(/[-_]/)[0];
  return isSupportedLocale(language) ? language : null;
}

export function resolveLocale(
  preference: LanguagePreference,
  deviceLocale: SupportedLocale,
): SupportedLocale {
  return preference === "system" ? deviceLocale : preference;
}

export const LOCALE_TAGS: Record<SupportedLocale, string> = {
  it: "it-IT",
  en: "en-US",
  de: "de-DE",
  fr: "fr-FR",
  es: "es-ES",
};
