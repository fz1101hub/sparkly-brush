import { View } from "react-native";
import { DesignText as Text } from "@/components/design-text";
import Svg, { Circle } from "react-native-svg";

import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";

type TimerRingProps = {
  elapsed: number;
  target: number;
  active: boolean;
};

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

export function TimerRing({ elapsed, target, active }: TimerRingProps) {
  const colors = useColors();
  const { t } = useI18n();
  const size = 212;
  const stroke = 16;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(1, elapsed / Math.max(1, target)));

  return (
    <View
      testID="manual-timer"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t("timerRing.label", {
        elapsed: formatTime(elapsed),
        target: formatTime(target),
      })}
      accessibilityValue={{
        min: 0,
        now: Math.max(0, Math.min(Math.round(elapsed), Math.round(target))),
        max: Math.max(1, Math.round(target)),
        text: t("timerRing.label", {
          elapsed: formatTime(elapsed),
          target: formatTime(target),
        }),
      }}
      aria-valuemin={0}
      aria-valuenow={Math.max(0, Math.min(Math.round(elapsed), Math.round(target)))}
      aria-valuemax={Math.max(1, Math.round(target))}
      aria-valuetext={t("timerRing.label", {
        elapsed: formatTime(elapsed),
        target: formatTime(target),
      })}
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colors.border}
          strokeWidth={stroke}
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={active ? "#2457D6" : "#8DA2D8"}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={{ color: colors.foreground, fontSize: 45, lineHeight: 54, fontWeight: "800" }}>
        {formatTime(elapsed)}
      </Text>
      <Text
        style={{
          color: colors.muted,
          fontSize: 14,
          lineHeight: 20,
          fontWeight: "600",
        }}
      >
        {t("timerRing.objective", { time: formatTime(target) })}
      </Text>
    </View>
  );
}
