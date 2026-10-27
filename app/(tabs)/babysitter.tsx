import { BabysitterGuide } from "@/components/babysitter-guide";
import { VillageScreen } from "@/components/village-ui";
import { useI18n } from "@/contexts/locale-context";

/** «Modalità babysitter» (voce 34): read-only instructions for whoever puts the child to bed. */
export default function BabysitterScreen() {
  const { t } = useI18n();
  return (
    <VillageScreen testID="babysitter-screen" eyebrow={t("tabs.family")} title={t("babysitter.screenTitle")}>
      <BabysitterGuide />
    </VillageScreen>
  );
}
