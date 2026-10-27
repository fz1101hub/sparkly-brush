import { SiblingsTogether } from "@/components/siblings-together";
import { VillageScreen } from "@/components/village-ui";
import { useI18n } from "@/contexts/locale-context";

/** «Fratelli insieme» (voce 46): one timer, a session for each child. */
export default function SiblingsScreen() {
  const { t } = useI18n();
  return (
    <VillageScreen testID="siblings-screen" eyebrow={t("tabs.family")} title={t("together.siblings.title")}>
      <SiblingsTogether />
    </VillageScreen>
  );
}
