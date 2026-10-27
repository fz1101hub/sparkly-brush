import { useState } from "react";

import { DesignText as Text } from "@/components/design-text";
import { ToothMap, type ToothMark } from "@/components/tooth-map";
import { VillageButton, VillageCard, VillageScreen, villageStyles } from "@/components/village-ui";
import { useI18n } from "@/contexts/locale-context";
import { contentLocale } from "@/lib/locale-types";
import { useVillage } from "@/contexts/village-context";
import { useColors } from "@/hooks/use-colors";
import { parseLocalDateKey } from "@/lib/day-progress";
import { TOOTH_NAMES, teethFor, type Tooth } from "@/lib/learning/tooth-names";
import { withLostTooth, withoutLostTooth } from "@/lib/village";

/**
 * «Casa del topolino» (the tooth fairy, the petite souris, the Ratoncito Pérez…): the child marks
 * the baby teeth that fall out, and the mouse thanks them. Free, also in the evening.
 */
const BABY_TEETH = teethFor("primary");

export default function ToothMouseScreen() {
  const colors = useColors();
  const { t, locale: appLocale, formatDate } = useI18n();
  // Educational content in the languages it exists in (voce 71: newer UI languages read English).
  const locale = contentLocale(appLocale);
  const village = useVillage();
  const [selected, setSelected] = useState<Tooth | null>(null);
  const [thanked, setThanked] = useState(false);
  const lost = village.state.lostTeeth;
  const marks: Record<string, ToothMark> = Object.fromEntries(lost.map((tooth) => [tooth.id, "lost" as const]));
  if (selected) marks[selected.id] = marks[selected.id] === "lost" ? "lost" : "selected";
  const selectedLost = selected ? lost.find((tooth) => tooth.id === selected.id) : undefined;
  const dayText = (day: string) => formatDate(parseLocalDateKey(day), { day: "numeric", month: "long", year: "numeric" });

  return (
    <VillageScreen testID="tooth-mouse-screen" eyebrow={t("village.title")} title={t("village.mouse.title")}>
      <VillageCard>
        <Text style={[villageStyles.body, { color: colors.foreground }]}>{t("mouse.intro")}</Text>
        <Text testID="mouse-count" style={[villageStyles.title, { color: colors.foreground }]}>
          {t("mouse.count", { count: lost.length })}
        </Text>
      </VillageCard>
      <ToothMap
        dentition="primary"
        colored
        marks={marks}
        onPress={(tooth) => {
          setSelected(tooth);
          setThanked(false);
        }}
      />
      {selected ? (
        <VillageCard>
          <Text accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>
            {TOOTH_NAMES[locale][selected.type]}
          </Text>
          {selectedLost ? (
            <>
              <Text testID="mouse-lost-on" style={[villageStyles.body, { color: colors.foreground }]}>
                {t("mouse.lostOn", { date: dayText(selectedLost.day) })}
              </Text>
              <VillageButton
                secondary
                testID="mouse-undo"
                icon="undo"
                label={t("mouse.undo")}
                onPress={() => void village.apply((state) => withoutLostTooth(state, selected.id))}
              />
            </>
          ) : (
            <VillageButton
              testID="mouse-record"
              icon="celebration"
              label={t("mouse.record")}
              onPress={() =>
                void village.apply((state) => withLostTooth(state, selected.id, Date.now())).then(() => setThanked(true))
              }
            />
          )}
        </VillageCard>
      ) : (
        <Text style={[villageStyles.small, { color: colors.muted }]}>{t("mouse.hint")}</Text>
      )}
      {thanked ? (
        <VillageCard>
          <Text testID="mouse-thanks" accessibilityRole="alert" style={[villageStyles.body, { color: colors.foreground, fontWeight: "800" }]}>
            {t("mouse.thanks")}
          </Text>
        </VillageCard>
      ) : null}
      {lost.length ? (
        <VillageCard>
          <Text accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>{t("mouse.listTitle")}</Text>
          {[...lost]
            .sort((first, second) => second.day.localeCompare(first.day))
            .map((lostTooth) => {
              const tooth = BABY_TEETH.find((item) => item.id === lostTooth.id);
              if (!tooth) return null;
              return (
                <Text key={tooth.id} style={[villageStyles.body, { color: colors.foreground }]}>
                  {t("mouse.listItem", {
                    date: dayText(lostTooth.day),
                    name: TOOTH_NAMES[locale][tooth.type],
                    arch: t(tooth.arch === "upper" ? "toothMap.upper" : "toothMap.lower"),
                    side: t(tooth.side === "right" ? "toothMap.right" : "toothMap.left"),
                  })}
                </Text>
              );
            })}
        </VillageCard>
      ) : null}
    </VillageScreen>
  );
}
