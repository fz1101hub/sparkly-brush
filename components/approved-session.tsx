import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
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
  const { width, height: windowHeight, fontScale } = useWindowDimensions();
  const [height, setHeight] = useState(windowHeight);
  const insets = useSafeAreaInsets();
  const footerPadding = Math.max(16, insets.bottom + 8);
  const footerHeight = 64 + footerPadding;
  const family = useFamily();
  const brush = useBrush();
  const { selected, stats } = useBrushling();
  const router = useRouter();
  const showSteps = theme.id === "adventure" || theme.id === "arcade";
  const timerSize = Math.min(width * 0.72, height * 0.29);
  const mouthSize = Math.min(width * 0.8, height * 0.3);
  const decoration = (
    {
      adventure: { sheet: "ac", rect: [287, 321, 28, 90] },
      arcade: { sheet: "ac", rect: [1295, 310, 16, 100] },
      cosmos: { sheet: "def", rect: [331, 259, 33, 132] },
      garden: { sheet: "def", rect: [907, 295, 31, 151] },
      bubbles: { sheet: "def", rect: [1489, 244, 35, 138] },
      underwater: { sheet: "i", rect: [1288, 437, 28, 160] },
    } satisfies Record<string, ArtworkRegion>
  )[theme.id];
  const background = d.sessionBase;
  const lowerBackground = {
    adventure: "#A6E5D9",
    arcade: "#10143C",
    cosmos: "#282043",
    garden: "#F4EDBE",
    bubbles: "#D8F4FF",
    underwater: "#034356",
  }[theme.id];
  const colorAt = (fraction: number) =>
    "#" +
    [1, 3, 5]
      .map((offset) =>
        Math.round(
          parseInt(background.slice(offset, offset + 2), 16) * (1 - fraction) +
            parseInt(lowerBackground.slice(offset, offset + 2), 16) * fraction,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");
  const name = getEvolution(selected, stats.level).name;
  return (
    <View
      testID={`approved-session-${theme.id}`}
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      style={{
        flex: 1,
        backgroundColor: background,
      }}
    >
      <Svg
        accessible={false}
        width={width}
        height={height}
        style={{ position: "absolute" }}
      >
        <Defs>
          <LinearGradient id="session-sky" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={background} />
            <Stop offset="1" stopColor={lowerBackground} />
          </LinearGradient>
        </Defs>
        <Rect width={width} height={height} fill="url(#session-sky)" />
      </Svg>
      <View
        pointerEvents="none"
        style={{ position: "absolute", left: 0, top: height * 0.16 }}
      >
        <ReferenceArtwork
          region={decoration}
          width={30}
          height={166}
          fit="contain"
          fadeColor={colorAt(0.25)}
        />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          right: 0,
          top: height * 0.46,
          transform: [{ scaleX: -1 }],
        }}
      >
        <ReferenceArtwork
          region={decoration}
          width={30}
          height={166}
          fit="contain"
          fadeColor={colorAt(0.55)}
        />
      </View>
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          flexGrow: 1,
          minHeight: Math.max(0, height - footerHeight),
          paddingHorizontal: 22,
          paddingTop: 5,
          paddingBottom: 0,
          alignItems: "center",
          gap: 4,
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
        <View style={{ marginTop: showSteps ? -42 : 0 }}>
          <MouthZones
            activeZone={brush.activeZone}
            isActive={brush.isActive}
            size={mouthSize}
            showSteps={showSteps}
          />
        </View>
        <View style={{ flex: 1, minHeight: 4 }} />
        <View
          style={{
            width: "100%",
            alignItems: "center",
            minHeight: showSteps ? 150 : 180,
            justifyContent: "center",
          }}
        >
          {selected.id === "bloopi" &&
          getEvolutionIndex(selected, stats.level) === 0 ? (
            <ReferenceArtwork
              region={d.buddy}
              width={width - 8}
              height={showSteps ? 150 : 180}
              fit="contain"
              fadeColor={colorAt(0.8)}
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
        {fontScale > 1.4 ? (
          <Text
            style={{ color: d.ink, fontFamily: "BrushlingsBody", fontSize: 14 }}
          >
            Quattro zone da trenta secondi, con il tuo compagno.
          </Text>
        ) : null}
      </ScrollView>
      <View
        style={{
          paddingHorizontal: 22,
          paddingTop: 6,
          paddingBottom: footerPadding,
        }}
      >
        <DesignButton
          compact
          label={brush.manualActive ? "Termina sessione" : "Apri spazzolino"}
          secondary={theme.id !== "garden"}
          onPress={() =>
            brush.manualActive
              ? void brush.stopManual()
              : router.push("/(tabs)/device")
          }
        >
          {brush.manualActive ? "Termina" : "Apri spazzolino"}
        </DesignButton>
      </View>
    </View>
  );
}
