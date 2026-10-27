export const SUPPORTED_LOCALES = ["it", "en", "de", "fr", "es", "pt", "nl", "pl"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/**
 * Languages of the educational content (quiz, stories, tooth names, garden, serial story). The
 * interface languages added later (voce 71) show that content in English until it is translated.
 */
export const CONTENT_LOCALES = ["it", "en", "de", "fr", "es"] as const;
export type ContentLocale = (typeof CONTENT_LOCALES)[number];

export function isContentLocale(value: unknown): value is ContentLocale {
  return typeof value === "string" && (CONTENT_LOCALES as readonly string[]).includes(value);
}

export function contentLocale(locale: SupportedLocale): ContentLocale {
  return isContentLocale(locale) ? locale : "en";
}
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
  pt: "pt-BR",
  nl: "nl-NL",
  pl: "pl-PL",
};
