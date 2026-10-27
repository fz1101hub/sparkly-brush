import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AnimatedBrushling } from "@/components/animated-brushling";
import { BrushlingAvatar } from "@/components/brushling-avatar";
import { DemoModeNotice } from "@/components/demo-mode-notice";
import {
  DesignButton,
  RoutinePills,
  SmileCoin,
} from "@/components/design-controls";
import { DesignText as Text } from "@/components/design-text";
import { ReferenceArtwork } from "@/components/reference-artwork";
import { useBrush } from "@/contexts/brush-context";
import { useCreatureBraces } from "@/contexts/braces-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useFamily } from "@/contexts/family-context";
import { useI18n } from "@/contexts/locale-context";
import { themeText } from "@/lib/app-themes";
import { APPROVED_DESIGN, type ArtworkRegion } from "@/lib/approved-design";
import { getEvolutionIndex } from "@/lib/brushlings";
import { errorText } from "@/lib/localized-error";
import { useThemeContext } from "@/lib/theme-provider";
import { ThemeScene } from "@/components/theme-scene";

/** The approved Today screen (from PR #10), with the session cards of this branch. */
export function ApprovedHome() {
  const { theme } = useThemeContext();
  const { t } = useI18n();
  const themeCopy = themeText(theme.id, t);
  const d = APPROVED_DESIGN[theme.id];
  const router = useRouter();
  const family = useFamily();
  const { width, height: screenHeight, fontScale } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [height, setHeight] = useState(
    Math.max(680, screenHeight - insets.top - 82),
  );
  const [error, setError] = useState<unknown>(null);
  const [logoWidth, setLogoWidth] = useState(Math.min(width * 0.5, 222));
  const [contentTop, setContentTop] = useState<number | null>(null);
  const brush = useBrush();
  const { selected, stats, walletCoins, missionCenter } = useBrushling();
  const braces = useCreatureBraces();
  // The approved pose is a fixed picture: with braces on, the creature that can wear them is shown.
  const useApprovedPose =
    !braces && selected.id === "bloopi" && getEvolutionIndex(selected, stats.level) === 0;
  const arcade = theme.id === "arcade";
  const longText = fontScale > 1.3;
  const pageHeight = Math.max(height, longText ? 1060 : 680);
  const artBottom =
    contentTop ??
    pageHeight - (arcade ? 207 : theme.id === "adventure" ? 345 : 292);
  const naturalArtHeight = (width * d.scene.rect[3]) / d.scene.rect[2];
  const artTop = Math.max(arcade ? 264 : 112, artBottom - naturalArtHeight);
  const artHeight = Math.max(120, artBottom - artTop);
  const sky = d.sky;
  const lowerArt = (
    {
      adventure: { sheet: "ac", rect: [33, 640, 22, 90] },
      arcade: { sheet: "ac", rect: [1480, 432, 24, 28] },
      cosmos: { sheet: "def", rect: [339, 361, 35, 37] },
      garden: { sheet: "def", rect: [907, 295, 31, 151] },
      bubbles: { sheet: "def", rect: [1489, 244, 35, 138] },
      underwater: { sheet: "i", rect: [1035, 504, 28, 162] },
    } satisfies Record<string, ArtworkRegion>
  )[theme.id];
  const disabled =
    brush.hasPendingManualSession ||
    brush.isSavingManualSession ||
    brush.manualStartPending ||
    !brush.manualRecoveryReady ||
    !!brush.recoveredManualSession ||
    family.busy;
  const run = async (operation: () => Promise<void>) => {
    setError(null);
    try {
      await operation();
    } catch (caught) {
      setError(caught);
    }
  };
  const stateCopy = t(
    brush.manualStartPending
      ? "home.timer.preparing"
      : brush.isSavingManualSession
        ? "home.timer.saving"
        : brush.hasPendingManualSession
          ? "home.timer.savePrevious"
          : "home.startTwoMinutes",
  );
  const headline = themeCopy.homeHeadline;
  const arcadeLast = headline[headline.length - 1] ?? "";
  const arcadeSplit = arcadeLast.lastIndexOf(" ");
  return (
    <View
      onLayout={(event) => setHeight(event.nativeEvent.layout.height)}
      style={{ flex: 1, backgroundColor: d.base }}
    >
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ minHeight: pageHeight, flexGrow: 1 }}
      >
        <View
          testID="today-screen"
          style={{
            minHeight: pageHeight,
            flex: 1,
            backgroundColor: d.base,
            overflow: "hidden",
          }}
        >
          <View style={{ pointerEvents: "none",
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: artTop + 15,
              backgroundColor: sky,
            }}
          />
          <View style={{ pointerEvents: "none",
              position: "absolute",
              top: artTop,
              left: 0,
              right: 0,
              height: artHeight,
            }}
          >
            {useApprovedPose ? (
              <ReferenceArtwork
                region={d.scene}
                width={width}
                height={artHeight}
                anchorY={arcade ? 0 : theme.id === "underwater" ? 0.3 : 1}
              />
            ) : (
              <ThemeScene
                themeId={theme.id}
                style={{ width, height: artHeight, borderRadius: 0 }}
              >
                <View
                  style={{
                    position: "absolute",
                    bottom: 4,
                    alignSelf: "center",
                  }}
                >
                  <AnimatedBrushling
                    creature={selected}
                    level={stats.level}
                    size={Math.min(width * 0.77, artHeight * 0.68)}
                    framed={false}
                    active={false}
                  />
                </View>
              </ThemeScene>
            )}
          </View>
          {!arcade ? (
            <Svg
              width={width}
              height={38}
              style={{ position: "absolute", top: artTop - 1 }}
            >
              <Defs>
                <LinearGradient id="scene-top" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={sky} />
                  <Stop offset="1" stopColor={sky} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Rect width={width} height={38} fill="url(#scene-top)" />
            </Svg>
          ) : null}
          {!arcade ? (
            <Svg
              width={width}
              height={90}
              style={{ position: "absolute", top: artTop + artHeight - 28 }}
            >
              <Defs>
                <LinearGradient id="scene-bottom" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={d.base} stopOpacity="0" />
                  <Stop offset="0.65" stopColor={d.base} />
                </LinearGradient>
              </Defs>
              <Rect width={width} height={90} fill="url(#scene-bottom)" />
            </Svg>
          ) : null}

          <View style={{ pointerEvents: "none",
              position: "absolute",
              left: 0,
              top: artBottom + (arcade || theme.id === "cosmos" ? 30 : 2),
            }}
          >
            <ReferenceArtwork
              region={lowerArt}
              width={40}
              height={arcade || theme.id === "cosmos" ? 42 : 220}
              fit="contain"
              fadeColor={d.base}
              fadeSize={12}
            />
          </View>
          <View style={{ pointerEvents: "none",
              position: "absolute",
              right: 0,
              top: artBottom + 120,
              transform: [{ scaleX: -1 }],
            }}
          >
            <ReferenceArtwork
              region={lowerArt}
              width={40}
              height={arcade || theme.id === "cosmos" ? 42 : 220}
              fit="contain"
              fadeColor={d.base}
              fadeSize={12}
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: 22,
              paddingTop: 8,
              minHeight: 68,
              gap: 12,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("home.profileButtonLabel", { name: family.active.name })}
              onPress={() => router.push("/(tabs)/settings")}
              onLayout={(event) => setLogoWidth(event.nativeEvent.layout.width)}
              style={{
                flex: 1,
                minHeight: 48,
                minWidth: 0,
                justifyContent: "center",
              }}
            >
              <ReferenceArtwork
                region={d.logo}
                width={Math.min(
                  logoWidth,
                  arcade || theme.id === "adventure" ? 222 : 238,
                )}
                height={arcade || theme.id === "adventure" ? 54 : 72}
                fit="contain"
                fadeColor={sky}
                fadeSize={4}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("home.coinsLabel", { count: walletCoins })}
              onPress={() => router.push("/(tabs)/rewards")}
              style={{
                minHeight: 44,
                maxWidth: "35%",
                flexShrink: 0,
                borderRadius: 25,
                flexDirection: "row",
                alignItems: "center",
                gap: 5,
                backgroundColor: arcade ? "#101640" : "#FFFDF2",
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderWidth: 1,
                borderColor: "#FFFFFFB0",
                shadowColor: "#092647",
                shadowOpacity: 0.12,
                shadowRadius: 4,
                shadowOffset: { width: 0, height: 2 },
              }}
            >
              <SmileCoin size={27} />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={{
                  flexShrink: 1,
                  fontFamily: "BrushlingsBlack",
                  fontSize: 18,
                  color: arcade ? "#FFFFFF" : "#122637",
                }}
              >
                {walletCoins}
              </Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("home.themeButtonLabel")}
            accessibilityHint={t("home.themeButtonHint", { theme: themeCopy.name, level: stats.level, xp: stats.xp })}
            onPress={() => router.push("/(tabs)/settings")}
            style={{
              minHeight: theme.id === "underwater" ? 52 : 38,
              marginHorizontal:
                width *
                (theme.id === "underwater"
                  ? 0.06
                  : arcade || theme.id === "adventure"
                    ? 0.14
                    : 0.18),
              borderRadius: 22,
              paddingHorizontal: 14,
              paddingVertical: arcade || theme.id === "adventure" ? 4 : 7,
              backgroundColor: arcade
                ? "#28245CBF"
                : theme.id === "cosmos"
                  ? "#49396BBF"
                  : "#FFFDF1EB",
              borderWidth: 1,
              borderColor: "#FFFFFFA0",
              flexDirection: "row",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 8,
            }}
          >
            {arcade || theme.id === "adventure" ? (
              <BrushlingAvatar
                creature={selected}
                level={stats.level}
                size={52}
                framed={false}
              />
            ) : null}
            <Text
              style={{
                color: arcade || theme.id === "cosmos" ? "#FFFFFF" : "#142F3E",
                fontFamily: "BrushlingsBlack",
                fontSize: theme.id === "underwater" ? 20 : 18,
                flexShrink: 1,
              }}
            >
              {t("home.level", { level: stats.level })}
            </Text>
            <View
              accessible
              accessibilityLabel={t("home.levelProgressLabel", { percent: Math.round(stats.levelProgress * 100) })}
              style={{
                flex: 1,
                minWidth: 24,
                height: theme.id === "underwater" ? 18 : 14,
                backgroundColor:
                  arcade || theme.id === "cosmos" ? "#6B5981" : "#DDDCCB",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${Math.max(0, stats.levelProgress * 100)}%`,
                  height: "100%",
                  borderRadius: 10,
                  backgroundColor: d.timer,
                }}
              />
            </View>
            {arcade || theme.id === "adventure" ? (
              <MaterialIcons
                accessible={false}
                name="star"
                size={28}
                color="#E7AD2F"
              />
            ) : null}
          </Pressable>

          {arcade ? (
            <View
              style={{
                marginTop: 22,
                marginHorizontal: 24,
                borderRadius: 28,
                borderWidth: 2,
                borderColor: "#58C7FF",
                backgroundColor: "#101C57",
                paddingVertical: 14,
                paddingHorizontal: 15,
                shadowColor: "#30A8FF",
                shadowOpacity: 0.9,
                shadowRadius: 14,
                shadowOffset: { width: 0, height: 0 },
                transform: [{ rotate: "-3deg" }],
              }}
            >
              <Text
                accessibilityRole="header"
                style={{
                  fontFamily: "BrushlingsDisplay",
                  color: "#FFFFFF",
                  fontSize: 35,
                  lineHeight: 39,
                  textAlign: "center",
                }}
              >
                {headline.slice(0, -1).map((line) => `${line}\n`).join("")}
                {arcadeSplit > 0 ? `${arcadeLast.slice(0, arcadeSplit)} ` : ""}
                <Text style={{ color: "#D7FB32" }}>{arcadeLast.slice(arcadeSplit + 1)}</Text>
              </Text>
              <Svg
                width={38}
                height={32}
                style={{ position: "absolute", right: 30, bottom: -25 }}
              >
                <Path
                  d="M3 1 H30 Q21 23 6 27 Q12 12 3 1Z"
                  fill="#101C57"
                  stroke="#58C7FF"
                  strokeWidth={2}
                />
              </Svg>
            </View>
          ) : null}
          <View style={{ flex: 1, minHeight: arcade ? 220 : 220 }} />

          <View
            onLayout={(event) => setContentTop(event.nativeEvent.layout.y)}
            style={{ paddingHorizontal: 24, paddingBottom: 7, gap: 12 }}
          >
            {!arcade ? (
              <Text
                accessibilityRole="header"
                style={{
                  color: d.ink,
                  fontFamily: "BrushlingsDisplay",
                  textAlign: "center",
                  fontSize: theme.id === "adventure" ? 40 : 39,
                  lineHeight: theme.id === "adventure" ? 41 : 42,
                  marginBottom: 3,
                  textShadowColor:
                    theme.scheme === "dark" ? "#09173C" : "#FFFFFF",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 1,
                }}
              >
                {headline.map((line, index) => (
                  <Text
                    key={`${index}-${line}`}
                    style={
                      index === 1 &&
                      (theme.id === "bubbles" || theme.id === "cosmos")
                        ? {
                            color:
                              theme.id === "cosmos" ? "#FFC09A" : "#E35F4D",
                          }
                        : undefined
                    }
                  >
                    {index ? "\n" : ""}
                    {line}
                  </Text>
                ))}
              </Text>
            ) : null}
            <RoutinePills
              morning={missionCenter.today.missions.some(
                (mission) => mission.id === "morning" && mission.completed,
              )}
              evening={missionCenter.today.missions.some(
                (mission) => mission.id === "evening" && mission.completed,
              )}
            />
            {brush.demoMode ? (
              <DemoModeNotice onExit={() => void run(() => brush.setDemoMode(false))} />
            ) : null}
            {brush.recoveredManualSession && !brush.hasPendingManualSession ? (
              <View
                testID="manual-recovery"
                style={{
                  backgroundColor: d.panel,
                  borderRadius: 22,
                  padding: 15,
                  gap: 9,
                }}
              >
                <Text
                  accessibilityRole="header"
                  style={{
                    color: d.ink,
                    fontFamily: "BrushlingsDisplay",
                    fontSize: 22,
                  }}
                >
                  {t("home.recovery.title")}
                </Text>
                <Text
                  style={{
                    color: d.ink,
                    fontFamily: "BrushlingsBody",
                    fontSize: 14,
                  }}
                >
                  {t("home.recovery.body", { seconds: brush.recoveredManualSession.elapsedSeconds })}
                </Text>
                <DesignButton
                  testID="manual-resume"
                  label={t("home.recovery.resume")}
                  disabled={family.busy || brush.manualStartPending || brush.live.isBrushing}
                  onPress={() => void run(brush.resumeManual)}
                >
                  {t("home.recovery.resume")}
                </DesignButton>
                <Pressable
                  testID="manual-discard"
                  accessibilityRole="button"
                  onPress={() => void run(brush.discardManualRecovery)}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text
                    style={{
                      color: d.ink,
                      fontFamily: "BrushlingsBody",
                      textAlign: "center",
                      fontSize: 14,
                    }}
                  >
                    {t("home.recovery.discard")}
                  </Text>
                </Pressable>
              </View>
            ) : null}
            {brush.hasPendingManualSession ? (
              <View
                testID="manual-save-error"
                accessibilityRole="alert"
                accessibilityLiveRegion="assertive"
                style={{
                  backgroundColor: d.panel,
                  borderRadius: 22,
                  padding: 15,
                  gap: 9,
                }}
              >
                <Text
                  style={{
                    color: d.ink,
                    fontFamily: "BrushlingsDisplay",
                    fontSize: 22,
                  }}
                >
                  {t("home.saveError.title")}
                </Text>
                <Text
                  style={{
                    color: d.ink,
                    fontFamily: "BrushlingsBody",
                    fontSize: 14,
                  }}
                >
                  {brush.manualSaveError ?? t("home.saveError.fallback")}
                </Text>
                <DesignButton
                  label={t("home.saveError.retryLabel")}
                  disabled={brush.isSavingManualSession}
                  busy={brush.isSavingManualSession}
                  onPress={() => void run(brush.retryManualSession)}
                >
                  {t(brush.isSavingManualSession ? "home.device.wait" : "home.saveError.retry")}
                </DesignButton>
              </View>
            ) : null}
            <DesignButton
              testID="manual-start-stop"
              label={t("home.timer.startManualLabel")}
              onPress={() => void run(brush.startManual)}
              disabled={disabled}
              busy={brush.manualStartPending || brush.isSavingManualSession}
            >
              {stateCopy}
              {arcade || theme.id === "adventure" ? "  →" : ""}
            </DesignButton>
            {braces ? (
              <Pressable
                testID="home-braces"
                accessibilityRole="button"
                onPress={() => router.push("/(tabs)/braces")}
                style={{ minHeight: 44, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }}
              >
                <MaterialIcons accessible={false} name="medical-services" color={d.ink} size={22} />
                <Text style={{ color: d.ink, fontFamily: "BrushlingsBody", fontSize: 14 }}>{t("home.bracesCare")}</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              testID="home-device-link"
              accessibilityLabel={t(
                brush.demoMode
                  ? "home.toothbrush.demo"
                  : brush.status === "connected"
                    ? "home.toothbrush.connectedLabel"
                    : "home.toothbrush.connect",
              )}
              onPress={() => router.push("/(tabs)/device")}
              style={{
                minHeight: 44,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
              }}
            >
              <MaterialIcons
                name={brush.demoMode ? "science" : "bluetooth"}
                color={theme.scheme === "dark" ? "#E6FAFF" : "#037DCA"}
                size={22}
              />
              <Text
                style={{
                  color: d.ink,
                  fontFamily: "BrushlingsBody",
                  fontSize: 14,
                }}
              >
                {t(
                  brush.demoMode
                    ? "home.toothbrush.demo"
                    : brush.status === "connected"
                      ? "home.toothbrush.connected"
                      : "home.toothbrush.connect",
                )}
              </Text>
            </Pressable>
            {error ||
            (brush.manualSaveError && !brush.hasPendingManualSession) ? (
              <Text
                accessibilityRole="alert"
                style={{
                  color: d.ink,
                  fontFamily: "BrushlingsBody",
                  fontSize: 14,
                }}
              >
                {error ? errorText(error, t) : brush.manualSaveError}
              </Text>
            ) : null}
            {!brush.manualRecoveryReady && brush.manualSaveError ? (
              <Pressable
                testID="manual-journal-error"
                accessibilityRole="button"
                onPress={() => void run(brush.discardManualRecovery)}
                style={{ minHeight: 44 }}
              >
                <Text style={{ color: d.ink, fontFamily: "BrushlingsBody" }}>
                  {t("home.recovery.discardUnreadable")}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
