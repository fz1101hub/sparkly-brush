import { useWindowDimensions } from "react-native";

/** Widest column the screens use (voce 72): on tablets the content stays centred and readable. */
export const MAX_CONTENT_WIDTH = 720;
export const TABLET_MIN_WIDTH = 700;

/** The window, with the width of the content column instead of the whole screen. */
export function useContentWidth() {
  const window = useWindowDimensions();
  return { ...window, width: Math.min(window.width, MAX_CONTENT_WIDTH), tablet: window.width >= TABLET_MIN_WIDTH };
}
