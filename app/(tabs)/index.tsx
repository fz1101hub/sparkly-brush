import { ScrollView } from "react-native";
import { DesignText as Text } from "@/components/design-text";
import { AppHeader } from "@/components/app-header";
import { ApprovedHome } from "@/components/approved-home";
import { ApprovedSession } from "@/components/approved-session";
import { SessionRewardModal } from "@/components/session-reward-modal";
import { StarterChooser } from "@/components/starter-chooser";
import { ScreenContainer } from "@/components/screen-container";
import { useBrush } from "@/contexts/brush-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useColors } from "@/hooks/use-colors";
import { useSessionKeepAwake } from "@/hooks/use-session-keep-awake";
import { useThemeContext } from "@/lib/theme-provider";
import { APPROVED_DESIGN } from "@/lib/approved-design";
function KeepAwake() {
  useSessionKeepAwake();
  return null;
}
export default function TodayScreen() {
  const colors = useColors();
  const { theme } = useThemeContext();
  const design = APPROVED_DESIGN[theme.id];
  const { status, isActive } = useBrush();
  const { profileReady, hasChosenStarter } = useBrushling();
  if (!profileReady || !hasChosenStarter)
    return (
      <ScreenContainer>
        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 20, paddingBottom: 40 }}
        >
          <AppHeader
            eyebrow="Brushlings"
            title={
              profileReady ? "Scegli il tuo compagno" : "Preparo l’avventura…"
            }
            connected={status === "connected"}
          />
          {profileReady ? (
            <StarterChooser />
          ) : (
            <Text style={{ color: colors.muted }}>
              Carico creature e progressi salvati su questo telefono.
            </Text>
          )}
        </ScrollView>
      </ScreenContainer>
    );
  return (
    <ScreenContainer
      style={{ backgroundColor: isActive ? design.sessionBase : design.sky }}
    >
      {isActive ? <KeepAwake /> : null}
      <SessionRewardModal />
      {isActive ? <ApprovedSession /> : <ApprovedHome />}
    </ScreenContainer>
  );
}
