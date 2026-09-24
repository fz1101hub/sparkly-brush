import { de } from "@/locales/de";
import { en } from "@/locales/en";
import { es } from "@/locales/es";
import { fr } from "@/locales/fr";
import { it, type TranslationCatalog, type TranslationKey } from "@/locales/it";
import { LOCALE_TAGS, type SupportedLocale } from "@/lib/locale-types";

export type TranslationParams = Record<string, string | number>;
type PlaceholderNames<Value extends string> =
  Value extends `${string}{${infer Name}}${infer Rest}`
    ? Name | PlaceholderNames<Rest>
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

function renderTranslation(
  locale: SupportedLocale,
  key: TranslationKey,
  params: TranslationParams,
): string {
  const template = TRANSLATIONS[locale][key] ?? it[key] ?? key;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => {
    const value = params[name];
    return value === undefined ? match : String(value);
  });
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
