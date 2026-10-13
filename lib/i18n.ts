import { de } from "@/locales/de";
import { en } from "@/locales/en";
import { es } from "@/locales/es";
import { fr } from "@/locales/fr";
import { it, type TranslationCatalog, type TranslationKey } from "@/locales/it";
import { LOCALE_TAGS, type SupportedLocale } from "@/lib/locale-types";

export type TranslationParams = Record<string, string | number>;
/** `{name}` inserts a value; `{name|one|other}` picks a form by the plural category of `name`. */
type PlaceholderNames<Value extends string> =
  Value extends `${string}{${infer Name}}${infer Rest}`
    ? (Name extends `${infer Base}|${string}` ? Base : Name) | PlaceholderNames<Rest>
    : never;

export type TranslationParamsFor<Key extends TranslationKey> = Record<
  PlaceholderNames<(typeof it)[Key]>,
  string | number
>;

type TranslationArguments<Key extends TranslationKey> = [
  PlaceholderNames<(typeof it)[Key]>,
] extends [never]
  ? [params?: never]
  : [params: TranslationParamsFor<Key>];

export type Translate = (
  key: TranslationKey,
  params?: TranslationParams,
) => string;

const TRANSLATIONS: Record<SupportedLocale, TranslationCatalog> = {
  it,
  en,
  de,
  fr,
  es,
};

/**
 * CLDR cardinal category for the integers the app counts. Every supported language has only
 * "one" and "other" here; French uses "one" for 0 and 1. Values may arrive already formatted
 * ("1.234", "1 234"), so only their digits are read.
 */
export function pluralCategory(locale: SupportedLocale, value: string | number): "one" | "other" {
  const count = typeof value === "number" ? Math.abs(value) : Number(String(value).replace(/\D/g, ""));
  if (!Number.isFinite(count) || String(value).replace(/\D/g, "") === "") return "other";
  if (locale === "fr") return count < 2 ? "one" : "other";
  return count === 1 ? "one" : "other";
}

function renderTranslation(
  locale: SupportedLocale,
  key: TranslationKey,
  params: TranslationParams,
): string {
  const template = TRANSLATIONS[locale][key] ?? it[key] ?? key;
  return template.replace(
    /\{([a-zA-Z0-9_]+)(?:\|([^|{}]*)\|([^|{}]*))?\}/g,
    (match, name: string, one: string | undefined, other: string | undefined) => {
      const value = params[name];
      if (value === undefined) return match;
      if (one === undefined || other === undefined) return String(value);
      return pluralCategory(locale, value) === "one" ? one : other;
    },
  );
}

export function translate<Key extends TranslationKey>(
  locale: SupportedLocale,
  key: Key,
  ...args: TranslationArguments<Key>
): string {
  return renderTranslation(locale, key, args[0] ?? {});
}

export function translateDynamic(
  locale: SupportedLocale,
  key: TranslationKey,
  params: TranslationParams = {},
): string {
  return renderTranslation(locale, key, params);
}

export function formatNumber(
  locale: SupportedLocale,
  value: number,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(LOCALE_TAGS[locale], options).format(value);
}

export function formatDate(
  locale: SupportedLocale,
  value: number | Date,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(LOCALE_TAGS[locale], options).format(value);
}

export type { TranslationKey };
