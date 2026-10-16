import { useThemeContext } from "@/lib/theme-provider";

export function useColors() {
  return useThemeContext().colors;
}

