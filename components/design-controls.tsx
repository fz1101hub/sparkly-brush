import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";
import { DesignText as Text } from "@/components/design-text";
import { useI18n } from "@/contexts/locale-context";
import { APPROVED_DESIGN } from "@/lib/approved-design";
import { useThemeContext } from "@/lib/theme-provider";

/** The approved glossy button (from PR #10). */
export function DesignButton({
  children,
  label,
  onPress,
  disabled = false,
  busy = false,
  secondary = false,
  compact = false,
  testID,
}: {
  children: ReactNode;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  secondary?: boolean;
  compact?: boolean;
  testID?: string;
}) {
  const { theme } = useThemeContext();
  const design = APPROVED_DESIGN[theme.id];
  const secondaryColors =
    theme.id === "bubbles"
      ? ["#06416D", "#002B52"]
      : theme.id === "arcade"
        ? ["#353D7C", "#272B62"]
        : theme.id === "cosmos"
          ? ["#7C63A5", "#56407F"]
          : theme.id === "underwater"
            ? ["#287D8D", "#155E70"]
            : [design.panel, design.panel];
  const fills = secondary ? secondaryColors : design.button;
  const text = secondary
    ? theme.id === "bubbles"
      ? "#FFFFFF"
      : design.ink
    : design.buttonText;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight:
          compact || secondary
            ? 58
            : theme.id === "adventure" || theme.id === "arcade"
              ? 78
              : 68,
        borderRadius: 40,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: 18,
        paddingVertical: 12,
        backgroundColor: secondary
          ? fills[1]
          : theme.id === "adventure"
            ? "#E8624F"
            : fills[1],
        shadowColor: "#071F41",
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 5,
        elevation: 3,
        opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 360 60"
        preserveAspectRatio="none"
        style={{ position: "absolute" }}
      >
        <Defs>
          <LinearGradient id="button-gloss" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={fills[0]} />
            <Stop offset="1" stopColor={fills[1]} />
          </LinearGradient>
        </Defs>
        <Rect
          x="1"
          y="1"
          width="358"
          height="58"
          rx="29"
          fill="url(#button-gloss)"
          stroke="#FFFFFF"
          strokeOpacity={0.7}
          strokeWidth="1.5"
        />
        <Path
          d="M18 14 Q24 4 43 4 H317 Q334 4 342 14"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity={0.32}
          strokeWidth="2"
          strokeLinecap="round"
        />
      </Svg>
      <Text
        style={{
          fontFamily: "BrushlingsDisplay",
          fontSize: compact || secondary ? 24 : 27,
          lineHeight: compact || secondary ? 30 : 34,
          textAlign: "center",
          color: text,
          textShadowColor: text === "#FFFFFF" ? "#A23D32" : "transparent",
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 1,
        }}
      >
        {children}
      </Text>
    </Pressable>
  );
}

export function SmileCoin({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Defs>
        <LinearGradient id="coin-gold" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFF8A3" />
          <Stop offset="0.5" stopColor="#FFD34A" />
          <Stop offset="1" stopColor="#F4A51F" />
        </LinearGradient>
      </Defs>
      <Ellipse cx="16" cy="17.5" rx="13" ry="13" fill="#CC771A" opacity={0.3} />
      <Circle
        cx="16"
        cy="15.5"
        r="13"
        fill="url(#coin-gold)"
        stroke="#D58C1C"
        strokeWidth="1.1"
      />
      <Circle
        cx="16"
        cy="15.5"
        r="10"
        fill="none"
        stroke="#FFF4A3"
        strokeWidth="1.2"
      />
      <Path
        d="M10 17 Q16 24 22 17 M12 12 v1 M20 12 v1"
        stroke="#D58C1C"
        strokeWidth="1.8"
        strokeLinecap="round"
        fill="none"
      />
      <Path
        d="M7 12 Q9 6 14 5"
        stroke="#FFFFFF"
        strokeOpacity={0.8}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

/** Today's morning and evening routine, ticked when the session is done. */
export function RoutinePills({
  morning,
  evening,
}: {
  morning: boolean;
  evening: boolean;
}) {
  const { theme } = useThemeContext();
  const { t } = useI18n();
  const d = APPROVED_DESIGN[theme.id];
  const underwater = theme.id === "underwater";
  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        borderRadius: 28,
        backgroundColor: underwater ? "#8AD6DC" : d.panel,
        borderColor: "#FFFFFFA0",
        borderWidth: 1,
        minHeight: theme.id === "adventure" || theme.id === "arcade" ? 54 : 50,
        overflow: "hidden",
      }}
    >
      {(
        [
          [t("reminderSettings.morning"), morning],
          [t("reminderSettings.evening"), evening],
        ] as const
      ).map(([name, complete], index) => (
        <View
          key={index}
          accessible
          accessibilityLabel={t(complete ? "routine.slotDone" : "routine.slotPending", { slot: name })}
          style={{
            flex: 1,
            minWidth: 135,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            padding: 9,
            backgroundColor: complete
              ? underwater
                ? "#09566A"
                : theme.id === "arcade"
                  ? "#89E2C333"
                  : "#FFE8B5"
              : "transparent",
          }}
        >
          {theme.id === "adventure" || theme.id === "arcade" || underwater ? (
            <Text
              style={{
                fontSize: 23,
                lineHeight: 26,
                color: index ? "#7C79B4" : "#F6AE22",
              }}
              accessible={false}
            >
              {index ? "☾" : "☀"}
            </Text>
          ) : null}
          <Text
            style={{
              color: underwater ? (complete ? "#FFFFFF" : "#073449") : d.ink,
              fontFamily: "BrushlingsBody",
              fontSize: 18,
            }}
          >
            {name}
          </Text>
          <Text
            accessible={false}
            style={{
              color: underwater
                ? complete
                  ? "#A9FFE8"
                  : "#073449"
                : complete
                  ? "#087F87"
                  : d.ink,
              fontFamily: "BrushlingsBlack",
              fontSize: 20,
            }}
          >
            {complete ? "✓" : "○"}
          </Text>
        </View>
      ))}
    </View>
  );
}
