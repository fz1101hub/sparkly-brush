import { type PropsWithChildren, useCallback, useEffect, useMemo } from "react";

import {
  LocaleContext,
  type LocaleContextValue,
} from "@/contexts/locale-context";
import { usePreferences } from "@/contexts/preferences-context";
import {
  formatDate as formatLocalizedDate,
  formatNumber as formatLocalizedNumber,
  translateDynamic,
  type TranslationKey,
  type TranslationParams,
} from "@/lib/i18n";
import {
  resolveLocale,
  type LanguagePreference,
  type SupportedLocale,
} from "@/lib/locale-types";

export type LocaleProviderProps = PropsWithChildren<{
  deviceLocale: SupportedLocale;
}>;

export function LocaleProvider({
  children,
  deviceLocale,
}: LocaleProviderProps) {
  const { preferences, ready, setPreference } = usePreferences();
  const locale = resolveLocale(preferences.language, deviceLocale);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.lang = locale;
    document.documentElement.dir = "ltr";
  }, [locale]);

  const setLanguagePreference = useCallback(
    async (value: LanguagePreference) => {
      await setPreference("language", value);
    },
    [setPreference],
  );

  const t = useCallback(
    (key: TranslationKey, params?: TranslationParams) =>
      translateDynamic(locale, key, params),
    [locale],
  );
  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      formatLocalizedNumber(locale, value, options),
    [locale],
  );
  const formatDate = useCallback(
    (value: number | Date, options: Intl.DateTimeFormatOptions) =>
      formatLocalizedDate(locale, value, options),
    [locale],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      languagePreference: preferences.language,
      setLanguagePreference,
      t,
      formatNumber,
      formatDate,
    }),
    [
      formatDate,
      formatNumber,
      locale,
      preferences.language,
      setLanguagePreference,
      t,
    ],
  );

  if (!ready) return null;

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}
