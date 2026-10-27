import { type PropsWithChildren, useEffect, useState } from "react";
import { AppState, type AppStateStatus } from "react-native";

import { LocaleProvider } from "@/contexts/locale-provider";
import { getDeviceLocale } from "@/lib/locale";

export function AppLocaleProvider({ children }: PropsWithChildren) {
  const [deviceLocale, setDeviceLocale] = useState(getDeviceLocale);

  useEffect(() => {
    const refreshDeviceLocale = (state: AppStateStatus) => {
      if (state === "active") setDeviceLocale(getDeviceLocale());
    };
    const subscription = AppState.addEventListener(
      "change",
      refreshDeviceLocale,
    );
    return () => subscription.remove();
  }, []);

  return (
    <LocaleProvider deviceLocale={deviceLocale}>{children}</LocaleProvider>
  );
}
