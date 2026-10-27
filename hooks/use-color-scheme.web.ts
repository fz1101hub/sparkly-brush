import { useThemeContext } from "@/lib/theme-provider";

/** On the web too, light or dark comes from the selected theme rather than the browser. */
export function useColorScheme() {
  return useThemeContext().colorScheme;
}
