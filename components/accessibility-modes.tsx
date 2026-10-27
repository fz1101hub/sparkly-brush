import { useFonts } from "expo-font";
import { useMemo, type PropsWithChildren } from "react";

import { useOptionalExtras } from "@/contexts/extras-context";
import { ReadingContext } from "@/contexts/reading-context";
import { ThemeOverride } from "@/lib/theme-provider";

/**
 * The child's accessibility modes (lotto 7), applied below the extras where they are kept: the
 * high-legibility font (Atkinson Hyperlegible, SIL OFL) and the high-contrast colours (voce 74).
 * The calm mode and the pre-reader mode are read where they act (sound, motion, session).
 */
export function AccessibilityModes({ children }: PropsWithChildren) {
  const extras = useOptionalExtras()?.extras;
  const [fontsReady, fontsError] = useFonts({
    BrushlingsLegible: require("@/assets/fonts/AtkinsonHyperlegible-Regular.ttf"),
    BrushlingsLegibleBold: require("@/assets/fonts/AtkinsonHyperlegible-Bold.ttf"),
  });
  const legibleFont = extras?.legibleFont === true && fontsReady && !fontsError;
  const reading = useMemo(() => ({ legibleFont }), [legibleFont]);
  return (
    <ThemeOverride highContrast={extras?.highContrast === true}>
      <ReadingContext.Provider value={reading}>{children}</ReadingContext.Provider>
    </ThemeOverride>
  );
}
