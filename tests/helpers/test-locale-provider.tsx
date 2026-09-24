import { type PropsWithChildren } from "react";

import {
  LocaleContext,
  type LocaleContextValue,
} from "@/contexts/locale-context";
import { formatDate, formatNumber, translateDynamic } from "@/lib/i18n";
import type { SupportedLocale } from "@/lib/locale-types";

export function TestLocaleProvider({
  children,
  locale = "it",
}: PropsWithChildren<{ locale?: SupportedLocale }>) {
  const value: LocaleContextValue = {
    locale,
    languagePreference: locale,
    setLanguagePreference: async () => undefined,
    t: (key, params) => translateDynamic(locale, key, params),
    formatNumber: (number, options) => formatNumber(locale, number, options),
    formatDate: (date, options) => formatDate(locale, date, options),
  };

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
