import { View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";

import { DesignText as Text } from "@/components/design-text";
import { useI18n } from "@/contexts/locale-context";
import { APPROVED_DESIGN } from "@/lib/approved-design";
import { useThemeContext } from "@/lib/theme-provider";

type TimerRingProps = {
  elapsed: number;
  target: number;
  active: boolean;
  size?: number;
};

function formatTime(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function formatCountdown(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}

function arc(start: number, end: number) {
  const point = (angle: number) => [
    120 + 105 * Math.cos((angle * Math.PI) / 180),
    120 + 105 * Math.sin((angle * Math.PI) / 180),
  ];
  const a = point(start);
  const b = point(end);
  return `M${a[0]} ${a[1]} A105 105 0 ${end - start > 180 ? 1 : 0} 1 ${b[0]} ${b[1]}`;
}

/**
 * The approved segmented countdown (from PR #10). Screen readers still get the elapsed time as a
 * progress bar, as before.
 */
export function TimerRing({ elapsed, target, active, size = 230 }: TimerRingProps) {
  const { theme } = useThemeContext();
  const { t } = useI18n();
  const d = APPROVED_DESIGN[theme.id];
  const remaining = Math.max(0, Math.min(1, 1 - elapsed / Math.max(1, target)));
  const gap = d.segments === 1 ? 0.2 : d.segments === 12 ? 3 : 5;
  const open = theme.id === "adventure" || theme.id === "arcade";
  const step = (open ? 270 : 360) / d.segments;
  const label = t("timerRing.label", { elapsed: formatTime(elapsed), target: formatTime(target) });
  const now = Math.max(0, Math.min(Math.round(elapsed), Math.round(target)));
  const max = Math.max(1, Math.round(target));
  return (
    <View
      testID="manual-timer"
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, now, max, text: label }}
      aria-valuemin={0}
      aria-valuenow={now}
      aria-valuemax={max}
      aria-valuetext={label}
      style={{ width: size, height: size, justifyContent: "center", alignItems: "center" }}
    >
      <Svg width={size} height={size} viewBox="0 0 240 240" style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="timer-highlight" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={d.timer} />
            <Stop offset="1" stopColor={theme.id === "cosmos" ? "#FFA583" : d.timer} />
          </LinearGradient>
        </Defs>
        {Array.from({ length: d.segments }, (_, i) => {
          const start = (open ? 135 : -90) + i * step + gap / 2;
          const end = start + step - gap;
          const filled = Math.max(0, Math.min(1, remaining * d.segments - i));
          return (
            <Segment key={i} start={start} end={end} filled={filled} track={d.timerTrack} rounded={d.segments !== 12} />
          );
        })}
      </Svg>
      <Text
        accessible={false}
        style={{ color: d.ink, fontFamily: "BrushlingsDisplay", fontSize: size * 0.27, lineHeight: size * 0.32 }}
      >
        {formatCountdown(target - elapsed)}
      </Text>
      {theme.id === "arcade" ? (
        <Text accessible={false} style={{ color: d.ink, fontFamily: "BrushlingsBody", fontSize: 16, marginTop: 3 }}>
          {t(active ? "timerRing.remaining" : "timerRing.together")}
        </Text>
      ) : null}
    </View>
  );
}

function Segment({
  start,
  end,
  filled,
  track,
  rounded,
}: {
  start: number;
  end: number;
  filled: number;
  track: string;
  rounded: boolean;
}) {
  const cap = rounded ? "round" : "butt";
  return (
    <>
      <Path d={arc(start, end)} fill="none" stroke={track} strokeWidth={15} strokeLinecap={cap} />
      {filled > 0 ? (
        <Path
          d={arc(start, start + (end - start) * filled)}
          fill="none"
          stroke="url(#timer-highlight)"
          strokeWidth={15}
          strokeLinecap={cap}
        />
      ) : null}
    </>
  );
}
