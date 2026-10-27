import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { type ComponentProps, useState } from "react";
import { View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { VillageButton, VillageCard, VillageScreen, villageStyles } from "@/components/village-ui";
import { useI18n } from "@/contexts/locale-context";
import { useVillage } from "@/contexts/village-context";
import { useColors } from "@/hooks/use-colors";
import type { TranslationKey } from "@/lib/i18n";

const STEPS: readonly { icon: ComponentProps<typeof MaterialIcons>["name"]; title: TranslationKey; text: TranslationKey }[] = [
  { icon: "weekend", title: "visit.step1.title", text: "visit.step1.text" },
  { icon: "airline-seat-recline-extra", title: "visit.step2.title", text: "visit.step2.text" },
  { icon: "light-mode", title: "visit.step3.title", text: "visit.step3.text" },
  { icon: "search", title: "visit.step4.title", text: "visit.step4.text" },
  { icon: "auto-awesome", title: "visit.step5.title", text: "visit.step5.text" },
  { icon: "emoji-events", title: "visit.step6.title", text: "visit.step6.text" },
];

/** «Prepara la visita»: what happens at the dentist, step by step, to take the fear away. Free. */
export default function DentistVisitScreen() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useI18n();
  const village = useVillage();
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const last = step === STEPS.length - 1;
  return (
    <VillageScreen testID="visit-screen" eyebrow={t("village.dentist.title")} title={t("visit.title")}>
      <VillageCard>
        <Text style={[villageStyles.small, { color: colors.muted }]}>{t("visit.progress", { current: step + 1, total: STEPS.length })}</Text>
        <View style={{ alignItems: "center", paddingVertical: 8 }}>
          <MaterialIcons accessible={false} name={current.icon} size={72} color={colors.foreground} />
        </View>
        <Text testID="visit-step-title" accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>
          {t(current.title)}
        </Text>
        <Text style={[villageStyles.body, { color: colors.foreground }]}>{t(current.text)}</Text>
        {last ? (
          <VillageButton
            testID="visit-done"
            icon="check"
            label={t("visit.done")}
            onPress={() => {
              void village.update({ visits: village.state.visits + 1 });
              router.back();
            }}
          />
        ) : (
          <VillageButton testID="visit-next" icon="arrow-forward" label={t("quiz.next")} onPress={() => setStep(step + 1)} />
        )}
        {step > 0 ? <VillageButton secondary label={t("visit.previous")} onPress={() => setStep(step - 1)} /> : null}
      </VillageCard>
    </VillageScreen>
  );
}
