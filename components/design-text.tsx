import { useOptionalPreferences } from "@/contexts/preferences-context";
import { forwardRef, type ElementRef } from "react";
import { StyleSheet, Text as NativeText, type TextProps } from "react-native";

export const DesignText = forwardRef<ElementRef<typeof NativeText>, TextProps>(
  function DesignText({ style, ...props }, ref) {
    const readable = useOptionalPreferences()?.preferences.care?.readableText === true;
    const flat = StyleSheet.flatten(style);
    const strong = Number(flat?.fontWeight) >= 800;
    const heading = strong && (flat?.fontSize ?? 0) >= 22;
    const family =
      flat?.fontFamily ??
      (heading
        ? "BrushlingsDisplay"
        : strong
          ? "BrushlingsBlack"
          : "BrushlingsBody");
    return (
      <NativeText
        {...props}
        ref={ref}
        style={[style, { fontFamily: readable ? undefined : family, fontWeight: readable ? "600" : "normal" }, readable && { letterSpacing: 0.7, lineHeight: Math.max(24, (flat?.fontSize ?? 16) * 1.5) }]}
      />
    );
  },
);
