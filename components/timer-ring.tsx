import { Text, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { useThemeContext } from "@/lib/theme-provider";
import { APPROVED_DESIGN } from "@/lib/approved-design";

type TimerRingProps = {
  elapsed: number;
  target: number;
  active: boolean;
  size?: number;
};
function formatTime(seconds: number) {
  const safe = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(safe % 60).padStart(2, "0")}`;
}
function arc(start: number, end: number) {
  const point = (angle: number) => [
    120 + 105 * Math.cos((angle * Math.PI) / 180),
    120 + 105 * Math.sin((angle * Math.PI) / 180),
  ];
  const a = point(start),
    b = point(end);
  return `M${a[0]} ${a[1]} A105 105 0 ${end - start > 180 ? 1 : 0} 1 ${b[0]} ${b[1]}`;
}
export function TimerRing({
  elapsed,
  target,
  active,
  size = 230,
}: TimerRingProps) {
  const { theme } = useThemeContext();
  const d = APPROVED_DESIGN[theme.id];
  const remaining = Math.max(0, Math.min(1, 1 - elapsed / Math.max(1, target)));
  const gap = d.segments === 1 ? 0.2 : d.segments === 12 ? 3 : 5;
  const open = theme.id === "adventure" || theme.id === "arcade";
  const step = (open ? 270 : 360) / d.segments;
  const showCaption = theme.id === "arcade";
  return (
    <View
      accessible
      accessibilityRole="timer"
      accessibilityLabel={`${formatTime(target - elapsed)} rimanenti su ${formatTime(target)}`}
      style={{
        width: size,
        height: size,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Svg
        accessible={false}
        width={size}
        height={size}
        viewBox="0 0 240 240"
        style={{ position: "absolute" }}
      >
        <Defs>
          <LinearGradient id="timer-highlight" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={d.timer} />
            <Stop
              offset="1"
              stopColor={theme.id === "cosmos" ? "#FFA583" : d.timer}
            />
          </LinearGradient>
        </Defs>
        {Array.from({ length: d.segments }, (_, i) => {
          const start = (open ? 135 : -90) + i * step + gap / 2;
          const end = start + step - gap;
          const filled = Math.max(0, Math.min(1, remaining * d.segments - i));
          return (
            <ViewlessArc
              key={i}
              start={start}
              end={end}
              filled={filled}
              track={d.timerTrack}
              rounded={d.segments !== 12}
            />
          );
        })}
      </Svg>
      <Text
        style={{
          color: d.ink,
          fontFamily: "BrushlingsDisplay",
          fontSize: size * 0.27,
          lineHeight: size * 0.32,
        }}
      >
        {formatTime(target - elapsed)}
      </Text>
      {showCaption ? (
        <Text
          style={{
            color: d.ink,
            fontFamily: "BrushlingsBody",
            fontSize: 16,
            marginTop: 3,
          }}
        >
          {active ? "Tempo rimanente" : "Due minuti insieme"}
        </Text>
      ) : null}
    </View>
  );
}
function ViewlessArc({
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
  return (
    <>
      <Path
        d={arc(start, end)}
        fill="none"
        stroke={track}
        strokeWidth={15}
        strokeLinecap={rounded ? "round" : "butt"}
      />
      {filled > 0 ? (
        <Path
          d={arc(start, start + (end - start) * filled)}
          fill="none"
          stroke="url(#timer-highlight)"
          strokeWidth={15}
          strokeLinecap={rounded ? "round" : "butt"}
        />
      ) : null}
    </>
  );
}
