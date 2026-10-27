import { View } from "react-native";

import { ELASTIC_COLORS, type BracesSettings } from "@/lib/braces";
import { CREATURE_CELL_SIZE, CREATURE_MOUTHS } from "@/lib/creature-mouths";

const STEEL = "#C9D3DC";
const STEEL_EDGE = "#7D8B99";

/**
 * Braces drawn on the creature's mouth, over the approved illustration: brackets with the
 * child's elastic colour for fixed braces, a clear tray for aligners, a thin wire for a
 * removable plate. An expander sits on the palate and is not visible.
 */
export function BracesOverlay({
  cell,
  size,
  braces,
}: {
  cell: number;
  size: number;
  braces: Pick<BracesSettings, "type" | "elasticColor">;
}) {
  const mouth = CREATURE_MOUTHS[cell];
  if (!mouth || braces.type === "expander") return null;
  const scale = size / CREATURE_CELL_SIZE;
  const left = mouth.x * scale;
  const top = mouth.y * scale;
  const width = mouth.width * scale;
  const height = mouth.height * scale;
  const unit = Math.max(1, scale);

  if (braces.type === "aligners") {
    return (
      <View
        testID="creature-braces"
        accessible={false}
        style={{
          pointerEvents: "none",
          position: "absolute",
          left: left - unit,
          top: top - unit,
          width: width + unit * 2,
          height: height * 0.55,
          borderRadius: height * 0.3,
          backgroundColor: "rgba(255,255,255,0.45)",
          borderWidth: Math.max(1, unit * 0.8),
          borderColor: "rgba(255,255,255,0.9)",
        }}
      />
    );
  }

  const wireTop = top + height * 0.28;
  const wire = (
    <View
      style={{
        position: "absolute",
        left: left + unit,
        top: wireTop,
        width: width - unit * 2,
        height: Math.max(1, 2.4 * unit),
        borderRadius: unit,
        backgroundColor: STEEL,
        borderColor: STEEL_EDGE,
        borderWidth: unit > 1.5 ? 0.5 : 0,
      }}
    />
  );

  if (braces.type === "removable") {
    return (
      <View testID="creature-braces" accessible={false} style={{ pointerEvents: "none", position: "absolute", left: 0, top: 0, width: size, height: size }}>
        {wire}
      </View>
    );
  }

  const bracket = Math.max(2.5, 6.5 * unit);
  const ring = Math.max(1, 1.6 * unit);
  const positions = [0.14, 0.38, 0.62, 0.86];
  return (
    <View testID="creature-braces" accessible={false} style={{ pointerEvents: "none", position: "absolute", left: 0, top: 0, width: size, height: size }}>
      {wire}
      {positions.map((position) => (
        <View
          key={position}
          style={{
            position: "absolute",
            left: left + width * position - bracket / 2,
            top: wireTop + Math.max(1, 2.4 * unit) / 2 - bracket / 2,
            width: bracket,
            height: bracket,
            borderRadius: bracket * 0.22,
            backgroundColor: STEEL,
            borderWidth: ring,
            borderColor: ELASTIC_COLORS[braces.elasticColor],
          }}
        />
      ))}
    </View>
  );
}
