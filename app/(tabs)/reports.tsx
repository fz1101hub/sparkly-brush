import { ParentGuard } from "@/components/parent-guard";
import { ReportsCenter } from "@/components/reports-center";
import { VillageScreen } from "@/components/village-ui";
import { useI18n } from "@/contexts/locale-context";

/** «Stampe e rapporti» (lotto 5), in the parent area. */
export default function ReportsScreen() {
  const { t } = useI18n();
  return (
    <ParentGuard>
      <VillageScreen testID="reports-screen" eyebrow={t("tabs.family")} title={t("reports.screenTitle")}>
        <ReportsCenter />
      </VillageScreen>
    </ParentGuard>
  );
}
