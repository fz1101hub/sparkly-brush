import { Platform, StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Ellipse, G, Path } from "react-native-svg";

import {
  getEvolution,
  getEvolutionIndex,
  type BrushlingDefinition,
  type BrushlingId,
} from "@/lib/brushlings";

export function BrushlingAvatar({
  creature,
  size = 120,
  level = 1,
  stageIndex,
  showLevelBadge = true,
}: {
  creature: BrushlingDefinition;
  size?: number;
  level?: number;
  stageIndex?: number;
  showLevelBadge?: boolean;
}) {
  const resolvedStage = Math.min(
    creature.evolutions.length - 1,
    Math.max(0, stageIndex ?? getEvolutionIndex(creature, level)),
  );
  const evolution =
    creature.evolutions[resolvedStage] ?? getEvolution(creature, level);

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${evolution.name}, creatura ${creature.element}, evoluzione ${resolvedStage + 1}`}
      style={[
        styles.shell,
        {
          width: size,
          height: size,
          borderRadius: size * 0.34,
          backgroundColor: creature.soft,
          borderColor: creature.accent,
        },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 120 120">
        <Circle cx="60" cy="60" r="48" fill="#FFFFFF" opacity={0.58} />
        <CreatureArt
          id={creature.id}
          stage={resolvedStage}
          accent={creature.accent}
        />
      </Svg>

      {showLevelBadge ? (
        <View
          style={[styles.levelBadge, { backgroundColor: creature.textAccent }]}
        >
          <Text style={styles.levelText}>Lv {level}</Text>
        </View>
      ) : null}
    </View>
  );
}

function CreatureArt({
  id,
  stage,
  accent,
}: {
  id: BrushlingId;
  stage: number;
  accent: string;
}) {
  if (id === "bloopi") return <BloopiFamily stage={stage} accent={accent} />;
  if (id === "spriggo") return <SpriggoFamily stage={stage} accent={accent} />;
  if (id === "flarello")
    return <FlarelloFamily stage={stage} accent={accent} />;
  if (id === "voltuff") return <Voltuff accent={accent} />;
  return <Moonbit accent={accent} />;
}

function Face({ y = 62 }: { y?: number }) {
  return (
    <G>
      <Circle cx="49" cy={y} r="3.2" fill="#17213C" />
      <Circle cx="71" cy={y} r="3.2" fill="#17213C" />
      <Path
        d={`M53 ${y + 10} Q60 ${y + 15} 67 ${y + 10}`}
        fill="none"
        stroke="#17213C"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <Circle cx="44" cy={y + 7} r="3.4" fill="#F69BAB" opacity={0.5} />
      <Circle cx="76" cy={y + 7} r="3.4" fill="#F69BAB" opacity={0.5} />
    </G>
  );
}

function BloopiFamily({ stage, accent }: { stage: number; accent: string }) {
  const bodyRy = stage === 0 ? 28 : stage === 1 ? 32 : 36;
  return (
    <G>
      {stage >= 1 ? (
        <>
          <Circle cx="24" cy="38" r="7" fill="#8EDBFF" opacity={0.8} />
          <Circle cx="95" cy="29" r="5" fill="#8EDBFF" opacity={0.8} />
        </>
      ) : null}
      {stage >= 2 ? (
        <>
          <Path
            d="M31 60 C13 55 11 76 28 79 C18 89 28 101 42 92"
            fill="#8EDBFF"
            stroke={accent}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <Path
            d="M45 29 C47 16 54 10 60 7 C66 10 73 16 75 29"
            fill="#BDEBFF"
            stroke={accent}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <Path
          d="M49 35 C50 24 56 18 60 14 C64 18 70 24 71 35"
          fill="#BDEBFF"
          stroke={accent}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      <Ellipse
        cx="60"
        cy="68"
        rx={stage === 2 ? 35 : stage === 1 ? 31 : 28}
        ry={bodyRy}
        fill="#86D8FF"
        stroke={accent}
        strokeWidth="3.5"
      />
      <Ellipse
        cx="37"
        cy="68"
        rx={stage === 0 ? 5 : 8}
        ry={stage === 0 ? 9 : 13}
        fill="#BDEBFF"
        stroke={accent}
        strokeWidth="2.5"
      />
      <Ellipse
        cx="83"
        cy="68"
        rx={stage === 0 ? 5 : 8}
        ry={stage === 0 ? 9 : 13}
        fill="#BDEBFF"
        stroke={accent}
        strokeWidth="2.5"
      />
      {stage >= 2 ? (
        <Path
          d="M47 91 Q60 101 73 91"
          fill="#DDF6FF"
          stroke={accent}
          strokeWidth="2.5"
        />
      ) : null}
      <Face y={64} />
    </G>
  );
}

function SpriggoFamily({ stage, accent }: { stage: number; accent: string }) {
  return (
    <G>
      {stage >= 2 ? (
        <>
          <Path
            d="M34 32 C18 20 13 34 25 45 C12 48 15 65 31 64"
            fill="#7DD790"
            stroke={accent}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <Path
            d="M86 32 C102 20 107 34 95 45 C108 48 105 65 89 64"
            fill="#7DD790"
            stroke={accent}
            strokeWidth="3"
            strokeLinejoin="round"
          />
        </>
      ) : null}
      <Ellipse
        cx="60"
        cy="70"
        rx={stage === 0 ? 27 : stage === 1 ? 31 : 34}
        ry={stage === 0 ? 28 : 32}
        fill="#A5E5A6"
        stroke={accent}
        strokeWidth="3.5"
      />
      <Path
        d={
          stage === 0
            ? "M59 39 C43 27 39 18 45 14 C54 16 60 24 60 36 C62 25 69 18 78 19 C81 27 73 36 61 40"
            : stage === 1
              ? "M58 39 C38 29 35 16 44 11 C54 13 60 22 60 35 C64 20 74 13 85 17 C84 29 75 37 62 41"
              : "M60 40 C38 31 32 16 42 9 C53 10 60 20 60 35 C65 18 78 9 90 14 C88 30 76 39 62 42"
        }
        fill="#64C878"
        stroke={accent}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {stage >= 1 ? (
        <Path
          d="M37 88 C44 80 49 79 55 87 C61 77 69 78 75 87 C81 80 87 83 90 90"
          fill="#6DCD80"
          stroke={accent}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      ) : null}
      {stage >= 2 ? (
        <Path
          d="M87 78 C105 75 107 91 95 95 C105 103 91 110 82 98"
          fill="none"
          stroke={accent}
          strokeWidth="5"
          strokeLinecap="round"
        />
      ) : null}
      <Face y={65} />
    </G>
  );
}

function FlarelloFamily({ stage, accent }: { stage: number; accent: string }) {
  return (
    <G>
      {stage >= 2 ? (
        <Path
          d="M28 72 C11 64 14 43 30 39 C20 24 38 13 47 29 C53 9 72 9 76 30 C90 17 105 31 94 45 C110 51 104 72 91 74"
          fill="#FFD06B"
          stroke={accent}
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
      ) : null}
      <Path
        d={
          stage === 0
            ? "M40 46 C30 34 34 22 44 20 C50 27 51 34 49 43 M80 46 C90 34 86 22 76 20 C70 27 69 34 71 43"
            : "M37 48 C25 34 29 19 42 15 C50 24 52 34 49 44 M83 48 C95 34 91 19 78 15 C70 24 68 34 71 44"
        }
        fill="#FFB65A"
        stroke={accent}
        strokeWidth="3.2"
        strokeLinejoin="round"
      />
      <Ellipse
        cx="60"
        cy="69"
        rx={stage === 0 ? 27 : stage === 1 ? 31 : 33}
        ry={stage === 0 ? 29 : 32}
        fill="#FFBF6C"
        stroke={accent}
        strokeWidth="3.5"
      />
      <Path
        d="M60 87 C49 80 48 69 55 64 C55 72 61 71 62 60 C70 70 73 81 60 87"
        fill="#FFF1A6"
        stroke={accent}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {stage >= 1 ? (
        <Path
          d="M83 80 C102 73 106 91 95 96 C108 101 96 112 84 101"
          fill="#FF9D45"
          stroke={accent}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      ) : null}
      {stage >= 2 ? (
        <>
          <Path
            d="M39 44 L32 33 L47 37"
            fill="#FFE08A"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <Path
            d="M81 44 L88 33 L73 37"
            fill="#FFE08A"
            stroke={accent}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </>
      ) : null}
      <Face y={63} />
    </G>
  );
}

function Voltuff({ accent }: { accent: string }) {
  return (
    <G>
      <Ellipse
        cx="60"
        cy="68"
        rx="30"
        ry="28"
        fill="#FFE778"
        stroke={accent}
        strokeWidth="3.5"
      />
      <Path
        d="M44 44 L51 25 L58 42 L68 23 L76 45"
        fill="#FFF5B5"
        stroke={accent}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Path
        d="M90 61 L103 54 L98 67 L108 72 L94 78"
        fill="#FFE778"
        stroke={accent}
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <Face y={64} />
    </G>
  );
}

function Moonbit({ accent }: { accent: string }) {
  return (
    <G>
      <Ellipse
        cx="60"
        cy="69"
        rx="29"
        ry="30"
        fill="#B9A8F3"
        stroke={accent}
        strokeWidth="3.5"
      />
      <Path
        d="M43 47 C34 31 41 20 52 25 C56 34 54 41 50 48 M77 47 C86 31 79 20 68 25 C64 34 66 41 70 48"
        fill="#D9D0FF"
        stroke={accent}
        strokeWidth="3"
      />
      <Path
        d="M57 85 C60 78 65 77 70 82"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <Circle cx="82" cy="38" r="7" fill="#FFF2A8" />
      <Circle cx="85" cy="35" r="6" fill="#F0ECFF" />
      <Face y={64} />
    </G>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    ...Platform.select({
      web: { boxShadow: "0 8px 18px rgba(23, 33, 60, 0.12)" },
      default: {
        shadowColor: "#17213C",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 18,
        elevation: 4,
      },
    }),
    overflow: "hidden",
  },
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
  levelText: {
    color: "#FFFFFF",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "900",
  },
});
