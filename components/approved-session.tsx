import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";

import { AnimatedBrushling } from "@/components/animated-brushling";
import { SessionExtras } from "@/components/session-extras";
import { DesignButton } from "@/components/design-controls";
import { DesignText as Text } from "@/components/design-text";
import { MouthZones } from "@/components/mouth-zones";
import { ReferenceArtwork } from "@/components/reference-artwork";
import { TimerRing } from "@/components/timer-ring";
import { useBrush } from "@/contexts/brush-context";
import { useCreatureBraces, useNewSmile } from "@/contexts/braces-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useOptionalExtras } from "@/contexts/extras-context";
import { useFamily } from "@/contexts/family-context";
import { useI18n } from "@/contexts/locale-context";
import { announce } from "@/lib/announce";
import { APPROVED_DESIGN, type ArtworkRegion } from "@/lib/approved-design";
import { CREATURE_EMOJI } from "@/lib/avatar";
import { getEvolution, getEvolutionIndex } from "@/lib/brushlings";
import { useThemeContext } from "@/lib/theme-provider";

/** The approved session screen (from PR #10): countdown, mouth zones and the companion. */
export function ApprovedSession() {
  const { theme } = useThemeContext();
  const { locale, t } = useI18n();
  const d = APPROVED_DESIGN[theme.id];
  const { width, height: windowHeight, fontScale } = useWindowDimensions();
  const [height, setHeight] = useState(windowHeight);
  const insets = useSafeAreaInsets();
  const footerPadding = Math.max(16, insets.bottom + 8);
  const footerHeight = 64 + footerPadding;
  const [measuredFooterHeight, setMeasuredFooterHeight] =
    useState(footerHeight);
  const [headerHeight, setHeaderHeight] = useState(44);
  const [zoneHeight, setZoneHeight] = useState(300);
  const family = useFamily();
  const brush = useBrush();
  const { selected, stats } = useBrushling();
  // For children who can't read yet (voce 40): a picture in place of the title.
  const preReader = useOptionalExtras()?.extras.preReader === true;
  const braces = useCreatureBraces();
  const newSmile = useNewSmile();
  const router = useRouter();
  const showSteps = theme.id === "adventure" || theme.id === "arcade";
  const timerSize = Math.min(width * 0.72, height * 0.29);
  const mouthSize = Math.min(width * 0.8, height * 0.3);
  const buddyHeight = Math.min(
    showSteps ? 150 : 180,
    Math.max(
      80,
      height -
        measuredFooterHeight -
        headerHeight -
        timerSize -
        zoneHeight -
        25 +
        (showSteps ? 42 : 0) -
        (fontScale > 1.4 ? 44 : 0),
    ),
  );
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
  const zoneNames = [
    t("timer.zone.upperRight"),
    t("timer.zone.upperLeft"),
    t("timer.zone.lowerLeft"),
    t("timer.zone.lowerRight"),
  ];
  const activeZoneName = zoneNames[brush.activeZone] ?? zoneNames[0];

  // Screen readers hear the zone to brush each time the guided timer moves on.
  useEffect(() => {
    if (!brush.isActive) return;
    announce(t("home.timer.activeZonePrompt", { zone: activeZoneName }));
  }, [activeZoneName, brush.isActive, t]);
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
      <View style={{ pointerEvents: "none", position: "absolute", left: 0, top: height * 0.16 }}
      >
        <ReferenceArtwork
          region={decoration}
          width={30}
          height={166}
          fit="contain"
          fadeColor={colorAt(0.25)}
        />
      </View>
      <View style={{ pointerEvents: "none",
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
          minHeight: Math.max(0, height - measuredFooterHeight),
          paddingHorizontal: 22,
          paddingTop: 5,
          paddingBottom: 0,
          alignItems: "center",
          gap: 4,
        }}
      >
        <View
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)}
          style={{
            width: "100%",
            flexDirection: "row",
            alignItems: "center",
            minHeight: 44,
            gap: 8,
          }}
        >
          <Pressable
            testID="manual-pause"
            accessibilityRole="button"
            accessibilityLabel={t(brush.manualActive ? "session.pause" : "session.openToothbrush")}
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
            accessibilityLabel={t("home.profileButtonLabel", { name: family.active.name })}
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
              {preReader ? `🪥 ${CREATURE_EMOJI[selected.id]}` : t("session.brushWith", { name })}
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
        <View
          onLayout={(event) => setZoneHeight(event.nativeEvent.layout.height)}
          style={{ marginTop: showSteps ? -42 : 0, maxWidth: "100%" }}
        >
          <MouthZones
            activeZone={brush.activeZone}
            isActive={brush.isActive}
            size={mouthSize}
            showSteps={showSteps}
          />
          <SessionExtras ink={d.ink} />
        </View>
        <View style={{ flex: 1, minHeight: 4 }} />
        <View
          style={{
            width: "100%",
            alignItems: "center",
            minHeight: buddyHeight,
            justifyContent: "center",
          }}
        >
          {/* The approved buddy has an Italian speech bubble drawn in: other languages get the animated companion. */}
          {!braces && !newSmile &&
          selected.id === "bloopi" &&
          getEvolutionIndex(selected, stats.level) === 0 &&
          locale === "it" ? (
            <ReferenceArtwork
              region={d.buddy}
              width={width - 8}
              height={buddyHeight}
              fit="contain"
              fadeColor={colorAt(0.8)}
            />
          ) : (
            <AnimatedBrushling
              creature={selected}
              level={stats.level}
              size={Math.min(
                showSteps ? 106 : 138,
                Math.max(60, buddyHeight - 8),
              )}
              framed={false}
              active
            />
          )}
        </View>
        {fontScale > 1.4 ? (
          <Text
            style={{ color: d.ink, fontFamily: "BrushlingsBody", fontSize: 14 }}
          >
            {t("session.largeTextHint")}
          </Text>
        ) : null}
      </ScrollView>
      <View
        onLayout={(event) =>
          setMeasuredFooterHeight(event.nativeEvent.layout.height)
        }
        style={{
          paddingHorizontal: 22,
          paddingTop: 6,
          paddingBottom: footerPadding,
        }}
      >
        <DesignButton
          compact
          testID="manual-start-stop"
          label={t(brush.manualActive ? "home.timer.stopSession" : "session.openToothbrush")}
          secondary={theme.id !== "garden"}
          onPress={() =>
            brush.manualActive
              ? void brush.stopManual()
              : router.push("/(tabs)/device")
          }
        >
          {t(brush.manualActive ? "session.end" : "session.openToothbrush")}
        </DesignButton>
      </View>
    </View>
  );
}
