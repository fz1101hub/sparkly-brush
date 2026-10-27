import { Pressable, StyleSheet, Text, View } from "react-native";

import { SessionCompanion } from "@/components/session-companion";
import { useBrush } from "@/contexts/brush-context";
import { useExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import type { TranslationKey } from "@/lib/i18n";
import { surfaceAt, type Surface } from "@/lib/session-tips";

const SURFACES: readonly Surface[] = ["outer", "inner", "chewing"];

function clock(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

/**
 * Under the mouth zones while brushing: the surface of the zone to brush now (voce 55: outside,
 * inside, on top, a third of the zone each) and «Spazziamo insieme» (voce 27), the grown-up's
 * own countdown next to the child's.
 */
export function SessionExtras({ ink }: { ink: string }) {
  const { t } = useI18n();
  const brush = useBrush();
  const { extras, apply, ready } = useExtras();
  if (!brush.isActive) return null;
  const current = surfaceAt(brush.activeElapsed, brush.activeTarget);
  const label = t(`surface.${current}` as TranslationKey);
  return (
    <View style={styles.stack}>
      <SessionCompanion ink={ink} />
      <View
        testID="session-surface"
        accessible
        accessibilityLiveRegion="polite"
        accessibilityLabel={t("surface.now", { surface: label })}
        style={styles.row}
      >
        {SURFACES.map((surface) => {
          const active = surface === current;
          return (
            <View key={surface} style={[styles.chip, { borderColor: ink, backgroundColor: active ? ink : "transparent" }]}>
              <Text style={[styles.chipText, { color: active ? "#FFFFFF" : ink }]}>{t(`surface.${surface}` as TranslationKey)}</Text>
            </View>
          );
        })}
      </View>
      <Pressable
        testID="brush-together"
        accessibilityRole="switch"
        accessibilityState={{ checked: extras.brushTogether }}
        aria-checked={extras.brushTogether}
        disabled={!ready}
        onPress={() => void apply((previous) => ({ ...previous, brushTogether: !previous.brushTogether }))}
        style={[styles.together, { borderColor: ink }]}
      >
        <Text style={[styles.chipText, { color: ink }]}>
          {extras.brushTogether
            ? t("together.parent", { time: clock(brush.activeTarget - brush.activeElapsed) })
            : t("together.toggle")}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { alignItems: "center", gap: 6, marginTop: 4 },
  row: { flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "center" },
  chip: { borderWidth: 1.5, borderRadius: 14, paddingHorizontal: 10, minHeight: 32, justifyContent: "center" },
  chipText: { fontSize: 14, lineHeight: 20, fontWeight: "800" },
  together: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 12, minHeight: 44, justifyContent: "center" },
});
