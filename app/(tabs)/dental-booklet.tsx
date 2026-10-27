import { DentalBooklet } from "@/components/dental-booklet";
import { ParentGuard } from "@/components/parent-guard";
import { VillageScreen } from "@/components/village-ui";
import { useI18n } from "@/contexts/locale-context";

/** The dental booklet (voce 64), in the parent area. */
export default function DentalBookletScreen() {
  const { t } = useI18n();
  return (
    <ParentGuard>
      <VillageScreen testID="booklet-screen" eyebrow={t("tabs.family")} title={t("booklet.title")}>
        <DentalBooklet />
      </VillageScreen>
    </ParentGuard>
  );
}
