import { getLocales } from "expo-localization";

import {
  DEFAULT_LOCALE,
  normalizeLocale,
  type SupportedLocale,
} from "@/lib/locale-types";

export * from "@/lib/locale-types";

export function getDeviceLocale(): SupportedLocale {
  const locales = getLocales();
  for (const locale of locales) {
    const supported = normalizeLocale(
      locale.languageCode ?? locale.languageTag,
    );
    if (supported) return supported;
  }
  return DEFAULT_LOCALE;
}
