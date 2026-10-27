import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { useI18n } from "@/contexts/locale-context";
import {
  TOOTH_NAMES,
  fdiNumber,
  isSixYearMolar,
  teethFor,
  type Dentition,
  type Tooth,
  type ToothType,
} from "@/lib/learning/tooth-names";

/** Pastel per kind of tooth, on a fixed light "gum" panel so it reads in every theme. */
export const TOOTH_COLORS: Record<ToothType, string> = {
  centralIncisor: "#BDE3FF",
  lateralIncisor: "#D7EEFF",
  canine: "#FFE7A3",
  premolar: "#C9F2D2",
  molar: "#FFD3B5",
  wisdom: "#E3D4FF",
};
const GUM = "#FBE7E7";
const OUTLINE = "#5B6B7F";

const SIZE: Record<ToothType, number> = {
  centralIncisor: 0.075,
  lateralIncisor: 0.068,
  canine: 0.074,
  premolar: 0.08,
  molar: 0.095,
  wisdom: 0.088,
};

/** "lost": a baby tooth that fell out (the mouse's house), drawn as a dashed gap. */
export type ToothMark = "selected" | "correct" | "wrong" | "lost";

/**
 * The mouth seen from the front, as when looking at a friend: the child's right side is on the
 * left of the screen. Every tooth is a button that says its name to screen readers.
 */
export function ToothMap({
  dentition,
  colored,
  marks = {},
  onPress,
  disabled = false,
  showFdi = false,
  starSixYear = false,
}: {
  dentition: Dentition;
  /** Colours by kind of tooth (exploring); plain white while playing, so colours give no hint. */
  colored: boolean;
  marks?: Record<string, ToothMark>;
  onPress: (tooth: Tooth) => void;
  disabled?: boolean;
  /** The dentists' FDI number on each tooth (parent option). */
  showFdi?: boolean;
  /** A star on the first adult molars, the new teeth to protect. */
  starSixYear?: boolean;
}) {
  const { t, locale } = useI18n();
  const { width: screen } = useWindowDimensions();
  const width = Math.min(screen - 48, 360);
  const height = width * 0.92;
  const teeth = teethFor(dentition);
  const scale = dentition === "permanent" ? 0.82 : 1;
  const perArch = teeth.length / 2;

  const place = (tooth: Tooth) => {
    // Left to right on screen: the child's right back to front, then their left front to back.
    const half = perArch / 2;
    const slot = tooth.side === "right" ? half - 1 - tooth.position : half + tooth.position;
    const margin = 0.1;
    const angle = Math.PI - margin - (slot / (perArch - 1)) * (Math.PI - 2 * margin);
    const rx = width * 0.4;
    const ry = height * 0.36;
    const x = width / 2 + rx * Math.cos(angle);
    const y = tooth.arch === "upper" ? height * 0.47 - ry * Math.sin(angle) : height * 0.53 + ry * Math.sin(angle);
    return { x, y };
  };

  return (
    <View
      testID="tooth-map"
      style={{ width, height, alignSelf: "center", borderRadius: width * 0.3, backgroundColor: GUM }}
    >
      {teeth.map((tooth) => {
        const { x, y } = place(tooth);
        const size = Math.max(30, width * SIZE[tooth.type] * scale);
        const mark = marks[tooth.id];
        const fdi = fdiNumber(tooth, dentition);
        const star = starSixYear && isSixYearMolar(tooth, dentition);
        const label = [
          t("toothMap.toothLabel", {
            name: TOOTH_NAMES[locale][tooth.type],
            arch: t(tooth.arch === "upper" ? "toothMap.upper" : "toothMap.lower"),
            side: t(tooth.side === "right" ? "toothMap.right" : "toothMap.left"),
          }),
          star ? t("toothMap.sixYear") : null,
          showFdi ? t("toothMap.fdi", { number: fdi }) : null,
          mark === "lost" ? t("toothMap.lost") : null,
        ]
          .filter(Boolean)
          .join(", ");
        return (
          <Pressable
            key={tooth.id}
            testID={`tooth-${tooth.id}`}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: mark === "selected", disabled }}
            disabled={disabled}
            onPress={() => onPress(tooth)}
            hitSlop={4}
            style={{
              position: "absolute",
              left: x - size / 2,
              top: y - size / 2,
              width: size,
              height: size,
              borderRadius: size * 0.38,
              backgroundColor:
                mark === "correct"
                  ? "#7BD88F"
                  : mark === "wrong"
                    ? "#FF9B9B"
                    : mark === "lost"
                      ? GUM
                      : colored
                        ? TOOTH_COLORS[tooth.type]
                        : "#FFFFFF",
              borderWidth: mark ? 3 : 1.5,
              borderStyle: mark === "lost" ? "dashed" : "solid",
              borderColor:
                mark === "selected"
                  ? "#1D4ED8"
                  : mark === "wrong"
                    ? "#B42318"
                    : mark === "correct"
                      ? "#17633F"
                      : mark === "lost"
                        ? "#6B7280"
                        : OUTLINE,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {star ? (
              <Text accessible={false} importantForAccessibility="no" style={styles.star}>
                ★
              </Text>
            ) : null}
            {showFdi ? (
              <Text accessible={false} importantForAccessibility="no" style={styles.fdi}>
                {fdi}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  star: { color: "#9A3412", fontSize: 14, lineHeight: 16, fontWeight: "900" },
  fdi: { color: "#17213C", fontSize: 10, lineHeight: 12, fontWeight: "800" },
});
