import { StyleSheet, View } from "react-native";

import { BracesOverlay } from "@/components/braces-overlay";
import { NewSmileOverlay } from "@/components/new-smile-overlay";
import { DesignText as Text } from "@/components/design-text";
import { ReferenceArtwork } from "@/components/reference-artwork";
import { useI18n } from "@/contexts/locale-context";
import type { BracesSettings } from "@/lib/braces";
import {
  getEvolution,
  getEvolutionIndex,
  type BrushlingDefinition,
  type BrushlingId,
} from "@/lib/brushlings";

/** Cells of the approved companions sheet (4 per row, 362 px each), one per evolution. */
const CELLS: Record<BrushlingId, readonly number[]> = {
  bloopi: [0, 1, 2],
  spriggo: [3, 4, 5],
  flarello: [6, 7, 8],
  voltuff: [9],
  moonbit: [10],
};
const CELL = 362;

/** A creature drawn from the approved artwork (from PR #10), framed or on its own. */
export function BrushlingAvatar({
  creature,
  size = 120,
  level = 1,
  stageIndex,
  framed = true,
  showLevelBadge = true,
  braces = null,
  newSmile = false,
}: {
  creature: BrushlingDefinition;
  size?: number;
  level?: number;
  stageIndex?: number;
  framed?: boolean;
  showLevelBadge?: boolean;
  /** The child's braces, drawn on their own creature only. */
  braces?: Pick<BracesSettings, "type" | "elasticColor"> | null;
  /** The two weeks after the braces came off: sparkles around the new smile. */
  newSmile?: boolean;
}) {
  const { t } = useI18n();
  const stage = Math.min(
    creature.evolutions.length - 1,
    Math.max(0, stageIndex ?? getEvolutionIndex(creature, level)),
  );
  const evolution = creature.evolutions[stage] ?? getEvolution(creature, level);
  const cells = CELLS[creature.id];
  const index = cells[Math.min(stage, cells.length - 1)] ?? cells[0];
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        t("avatar.label", { name: evolution.name, element: creature.element, stage: stage + 1 })
        + (braces ? t("braces.avatarSuffix") : "")
        + (newSmile && !braces ? t("braces.newSmileSuffix") : "")
      }
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: framed ? creature.soft : "transparent",
          borderWidth: framed ? 1 : 0,
          borderColor: `${creature.accent}55`,
        },
      ]}
    >
      <ReferenceArtwork
        region={{ sheet: "creatures", rect: [(index % 4) * CELL, Math.floor(index / 4) * CELL, CELL, CELL] }}
        width={size}
        height={size}
        fit="contain"
      />
      {braces ? <BracesOverlay cell={index} size={size} braces={braces} /> : null}
      {newSmile && !braces ? <NewSmileOverlay cell={index} size={size} /> : null}
      {framed && showLevelBadge ? (
        <View style={[styles.levelBadge, { backgroundColor: creature.textAccent }]}>
          <Text style={styles.levelText}>{t("avatar.levelBadge", { level })}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  levelBadge: {
    position: "absolute",
    bottom: 7,
    right: 7,
    minWidth: 42,
    minHeight: 24,
    paddingHorizontal: 8,
    borderRadius: 99,
    alignItems: "center",
    justifyContent: "center",
  },
  levelText: { color: "#FFFFFF", fontSize: 11, lineHeight: 15, fontWeight: "900" },
});
