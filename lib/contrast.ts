/** High-contrast colours (voce 74): black on white or white on black, strong borders. */
export function highContrastColors<T extends Record<string, string>>(colors: T, scheme: "light" | "dark"): T {
  const ink = scheme === "dark" ? "#FFFFFF" : "#000000";
  const paper = scheme === "dark" ? "#000000" : "#FFFFFF";
  return {
    ...colors,
    foreground: ink,
    text: ink,
    muted: ink,
    icon: ink,
    background: paper,
    surface: paper,
    border: ink,
    primary: scheme === "dark" ? "#FFE14D" : "#0033CC",
    tint: scheme === "dark" ? "#FFE14D" : "#0033CC",
    primaryText: scheme === "dark" ? "#000000" : "#FFFFFF",
    primarySoft: paper,
  };
}
