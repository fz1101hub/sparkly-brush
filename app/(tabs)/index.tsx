import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ScrollView, StyleSheet, View } from "react-native";

import { AppHeader } from "@/components/app-header";
import { ApprovedHome } from "@/components/approved-home";
import { ApprovedSession } from "@/components/approved-session";
import { DesignText as Text } from "@/components/design-text";
import { ScreenContainer } from "@/components/screen-container";
import { SessionRewardModal } from "@/components/session-reward-modal";
import { StarterChooser } from "@/components/starter-chooser";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { useSessionKeepAwake } from "@/hooks/use-session-keep-awake";
import { APPROVED_DESIGN } from "@/lib/approved-design";
import { useThemeContext } from "@/lib/theme-provider";

/** Keeps the screen on only while a session runs: a locked phone would pause the guided timer. */
function SessionKeepAwake() {
  useSessionKeepAwake();
  return null;
}

/** Today (from PR #10): the approved home, or the session screen while brushing. */
export default function TodayScreen() {
  const colors = useColors();
  const { t } = useI18n();
  const { theme } = useThemeContext();
  const design = APPROVED_DESIGN[theme.id];
  const { status, isActive } = useBrush();
  const { profileReady, hasChosenStarter } = useBrushling();

  if (!profileReady || !hasChosenStarter) {
    return (
      <ScreenContainer>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <AppHeader
            eyebrow={t("app.brand")}
            title={t(profileReady ? "home.starter.headerTitle" : "home.loading.headerTitle")}
            connected={status === "connected"}
          />
          {profileReady ? (
            <>
              <StarterChooser />
              <View style={styles.privacyNote}>
                <MaterialIcons name="lock-outline" size={18} color={colors.muted} />
                <Text style={[styles.privacyText, { color: colors.muted }]}>{t("home.starter.privacyNote")}</Text>
              </View>
            </>
          ) : (
            <View style={[styles.loadingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <MaterialIcons name="auto-awesome" size={30} color={colors.primary} />
              <Text style={[styles.loadingTitle, { color: colors.foreground }]}>{t("home.loading.title")}</Text>
              <Text style={[styles.loadingCopy, { color: colors.muted }]}>{t("home.loading.description")}</Text>
            </View>
          )}
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={{ backgroundColor: isActive ? design.sessionBase : design.sky }}>
      {isActive ? <SessionKeepAwake /> : null}
      <SessionRewardModal />
      {isActive ? <ApprovedSession /> : <ApprovedHome />}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 120, gap: 18 },
  loadingCard: { borderWidth: 1, borderRadius: 24, padding: 22, alignItems: "center" },
  loadingTitle: { fontSize: 20, lineHeight: 26, fontWeight: "900", marginTop: 10 },
  loadingCopy: { fontSize: 12, lineHeight: 18, textAlign: "center", marginTop: 4, maxWidth: 280 },
  privacyNote: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 5 },
  privacyText: { fontSize: 12, lineHeight: 17, flex: 1, textAlign: "center" },
});
