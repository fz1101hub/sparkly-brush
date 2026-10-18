import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { AnimatedBrushling } from "@/components/animated-brushling";
import { DesignButton } from "@/components/design-controls";
import { MouthZones } from "@/components/mouth-zones";
import { ReferenceArtwork } from "@/components/reference-artwork";
import { TimerRing } from "@/components/timer-ring";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useFamily } from "@/contexts/family-context";
import { APPROVED_DESIGN, type ArtworkRegion } from "@/lib/approved-design";
import { getEvolution, getEvolutionIndex } from "@/lib/brushlings";
import { useThemeContext } from "@/lib/theme-provider";

export function ApprovedSession() {
  const { theme } = useThemeContext();
  const d = APPROVED_DESIGN[theme.id];
  const { width, height, fontScale } = useWindowDimensions();
  const family = useFamily();
  const brush = useBrush();
  const { selected, stats } = useBrushling();
  const router = useRouter();
  const showSteps = theme.id === "adventure" || theme.id === "arcade";
  const timerSize = Math.min(width * 0.66, height * (showSteps ? 0.247 : 0.27));
  const mouthSize = Math.min(width * 0.67, height * (showSteps ? 0.225 : 0.25));
  const [sx, sy, sw, sh] = d.session.rect;
  const edge = (right: boolean): ArtworkRegion => ({
    sheet: d.session.sheet,
    rect: [right ? sx + sw - 20 : sx, sy + 70, 20, sh - 110],
  });
  const name = getEvolution(selected, stats.level).name;
  return (
    <View
      testID={`approved-session-${theme.id}`}
      style={{
        flex: 1,
        backgroundColor:
          theme.id === "adventure"
            ? "#D8F4EB"
            : theme.id === "bubbles"
              ? "#E1F6FF"
              : d.base,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          opacity: 0.95,
        }}
      >
        <ReferenceArtwork region={edge(false)} width={33} height={height} />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          bottom: 0,
          opacity: 0.95,
        }}
      >
        <ReferenceArtwork region={edge(true)} width={33} height={height} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          minHeight: height - 32,
          paddingHorizontal: 22,
          paddingTop: 5,
          paddingBottom: 16,
          alignItems: "center",
          gap: showSteps ? 6 : 10,
        }}
      >
        <View
          style={{
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            minHeight: 44,
            gap: 8,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Metti in pausa"
            onPress={() =>
              brush.manualActive
                ? void brush.pauseManual()
                : router.push("/(tabs)/device")
            }
            style={{ minWidth: 44, minHeight: 44, justifyContent: "center" }}
          >
            <MaterialIcons name="arrow-back" size={25} color={d.ink} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Profilo attivo: ${family.active.name}. Cambia profilo`}
            onPress={() => router.push("/(tabs)/settings")}
            style={{ flex: 1, minHeight: 44, justifyContent: "center" }}
          >
            <Text
              style={{
                fontFamily: "BrushlingsDisplay",
                color: d.ink,
                fontSize: 22,
                textAlign: "center",
              }}
            >
              Spazzola con {name}
            </Text>
          </Pressable>
          <View style={{ width: 24 }} />
        </View>
        <TimerRing
          elapsed={brush.activeElapsed}
          target={brush.activeTarget}
          active={brush.isActive}
          size={timerSize}
        />
        <MouthZones
          activeZone={brush.activeZone}
          isActive={brush.isActive}
          size={mouthSize}
          showSteps={showSteps}
        />
        <View style={{ flex: 1, minHeight: 4 }} />
        <View
          style={{
            width: "100%",
            alignItems: "center",
            minHeight: showSteps ? 94 : 124,
            justifyContent: "center",
          }}
        >
          {selected.id === "bloopi" &&
          getEvolutionIndex(selected, stats.level) === 0 ? (
            <ReferenceArtwork
              region={d.buddy}
              width={showSteps ? 165 : 210}
              height={showSteps ? 105 : 140}
              fit="contain"
            />
          ) : (
            <AnimatedBrushling
              creature={selected}
              level={stats.level}
              size={showSteps ? 106 : 138}
              framed={false}
              active
            />
          )}
        </View>
        <View style={{ width: "100%", marginTop: 3 }}>
          <DesignButton
            label={brush.manualActive ? "Termina sessione" : "Apri spazzolino"}
            secondary={
              theme.id === "adventure" ||
              theme.id === "arcade" ||
              theme.id === "cosmos" ||
              theme.id === "bubbles"
            }
            onPress={() =>
              brush.manualActive
                ? void brush.stopManual()
                : router.push("/(tabs)/device")
            }
          >
            {brush.manualActive ? "Termina" : "Apri spazzolino"}
          </DesignButton>
        </View>
        {fontScale > 1.4 ? (
          <Text
            style={{ color: d.ink, fontFamily: "BrushlingsBody", fontSize: 14 }}
          >
            Quattro zone da trenta secondi, con il tuo compagno.
          </Text>
        ) : null}
      </ScrollView>
    </View>
  );
}
