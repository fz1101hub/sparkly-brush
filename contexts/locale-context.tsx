import { createContext, useContext } from "react";

import type { Translate, TranslationKey, TranslationParams } from "@/lib/i18n";
import type { LanguagePreference, SupportedLocale } from "@/lib/locale-types";

export type LocaleContextValue = {
  locale: SupportedLocale;
  languagePreference: LanguagePreference;
  setLanguagePreference: (value: LanguagePreference) => Promise<void>;
  t: Translate;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
  formatDate: (
    value: number | Date,
    options: Intl.DateTimeFormatOptions,
  ) => string;
};

export const LocaleContext = createContext<LocaleContextValue | null>(null);

export function useI18n(): LocaleContextValue {
  const value = useContext(LocaleContext);
  if (!value) throw new Error("useI18n must be used inside LocaleProvider");
  return value;
}

export type { TranslationKey, TranslationParams };
