import { useThemeContext } from "@/lib/theme-provider";

/** Colors of the active profile's theme. Usage: const colors = useColors(); colors.foreground… */
export function useColors() {
  return useThemeContext().colors;
}
