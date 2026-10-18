import { Text, View } from "react-native";
import { ReferenceArtwork } from "@/components/reference-artwork";
import {
  getEvolution,
  getEvolutionIndex,
  type BrushlingDefinition,
  type BrushlingId,
} from "@/lib/brushlings";

const CELLS: Record<BrushlingId, readonly number[]> = {
  bloopi: [0, 1, 2],
  spriggo: [3, 4, 5],
  flarello: [6, 7, 8],
  voltuff: [9],
  moonbit: [10],
};

export function BrushlingAvatar({
  creature,
  size = 120,
  level = 1,
  stageIndex,
  framed = true,
}: {
  creature: BrushlingDefinition;
  size?: number;
  level?: number;
  stageIndex?: number;
  framed?: boolean;
}) {
  const stage = Math.min(
    creature.evolutions.length - 1,
    Math.max(0, stageIndex ?? getEvolutionIndex(creature, level)),
  );
  const index = CELLS[creature.id][stage] ?? CELLS[creature.id][0];
  const name =
    creature.evolutions[stage]?.name ?? getEvolution(creature, level).name;
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${name}, creatura ${creature.element}, evoluzione ${stage + 1}`}
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: size * 0.28,
        backgroundColor: framed ? creature.soft : "transparent",
        borderWidth: framed ? 1 : 0,
        borderColor: creature.accent + "55",
      }}
    >
      <ReferenceArtwork
        region={{
          sheet: "creatures",
          rect: [(index % 4) * 362, Math.floor(index / 4) * 362, 362, 362],
        }}
        width={size}
        height={size}
        fit="contain"
      />
      {framed ? (
        <View
          style={{
            position: "absolute",
            bottom: 0,
            minWidth: 42,
            borderRadius: 14,
            paddingHorizontal: 7,
            paddingVertical: 3,
            backgroundColor: "#17213C",
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontFamily: "BrushlingsBlack",
              fontSize: 10,
              textAlign: "center",
            }}
          >
            Lv {level}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
