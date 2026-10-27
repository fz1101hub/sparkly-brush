import { createContext, useContext } from "react";

/**
 * Reading aids of the active child (voce 74): the high-legibility font. Read by DesignText, so it
 * applies to every text drawn with the app's fonts.
 */
export const ReadingContext = createContext<{ legibleFont: boolean }>({ legibleFont: false });

export function useLegibleFont(): boolean {
  return useContext(ReadingContext).legibleFont;
}
