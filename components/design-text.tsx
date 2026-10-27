import { forwardRef, type ElementRef } from "react";
import { StyleSheet, Text as NativeText, type TextProps } from "react-native";

import { useLegibleFont } from "@/contexts/reading-context";

export const DesignText = forwardRef<ElementRef<typeof NativeText>, TextProps>(
  function DesignText({ style, ...props }, ref) {
    const legible = useLegibleFont();
    const flat = StyleSheet.flatten(style);
    const strong = Number(flat?.fontWeight) >= 800;
    const heading = strong && (flat?.fontSize ?? 0) >= 22;
    // The high-legibility font (voce 74) replaces the app's own fonts, not the ones of artwork.
    const appFont = !flat?.fontFamily || flat.fontFamily.startsWith("Brushlings");
    const family = legible && appFont
      ? (strong || flat?.fontFamily === "BrushlingsDisplay" || flat?.fontFamily === "BrushlingsBlack" ? "BrushlingsLegibleBold" : "BrushlingsLegible")
      : flat?.fontFamily ??
      (heading
        ? "BrushlingsDisplay"
        : strong
          ? "BrushlingsBlack"
          : "BrushlingsBody");
    return (
      <NativeText
        {...props}
        ref={ref}
        style={[style, { fontFamily: family, fontWeight: "normal" }]}
      />
    );
  },
);
