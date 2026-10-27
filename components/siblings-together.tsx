import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { VillageButton } from "@/components/village-ui";
import { useBrush } from "@/contexts/brush-context";
import { useOptionalFamily } from "@/contexts/family-context-value";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import type { BrushSession } from "@/lib/brush-types";
import { getBrushStorage } from "@/lib/brush-storage";
import { manualTargetFor } from "@/lib/manual-session-storage";

const ZONES = ["↗️", "↖️", "↙️", "↘️"];

/**
 * «Fratelli insieme» (voce 46): one guided timer for two or more children brushing side by side;
 * at the end each child gets the session in their own profile. With handles, each one already
 * records its own child: this is for the timer, two handles at once are not supported.
 */
export function SiblingsTogether() {
  const colors = useColors();
  const { t } = useI18n();
  const family = useOptionalFamily();
  const brush = useBrush();
  const [chosen, setChosen] = useState<string[]>(() => (family ? [family.active.id] : []));
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const saving = useRef(false);
  const target = manualTargetFor(120);
  const profiles = useMemo(() => family?.profiles ?? [], [family?.profiles]);

  useEffect(() => {
    if (startedAt === null) return;
    const timer = setInterval(() => setElapsed(Math.min(target, Math.floor((Date.now() - startedAt) / 1000))), 250);
    return () => clearInterval(timer);
  }, [startedAt, target]);

  useEffect(() => {
    if (startedAt === null || elapsed < target || saving.current) return;
    saving.current = true;
    const names = profiles.filter((profile) => chosen.includes(profile.id)).map((profile) => profile.name);
    void Promise.all(chosen.map((profileId) => {
      const session: BrushSession = {
        id: `together-${startedAt}-${profileId}`,
        startedAt,
        timeConfidence: "exact",
        rewardPolicy: "completed-only",
        durationSeconds: target,
        targetSeconds: target,
        completed: true,
        source: "manual",
      };
      return getBrushStorage(profileId).saveSessionWithLifetime(session);
    }))
      .then(() => brush.reloadRealHistory())
      .then(() => setMessage(t("together.siblings.saved", { names: names.join(", ") })), () => setMessage(t("common.actionFailedMessage")))
      .finally(() => {
        saving.current = false;
        setStartedAt(null);
        setElapsed(0);
      });
  }, [brush, chosen, elapsed, profiles, startedAt, t, target]);

  if (profiles.length < 2) {
    return <Text testID="siblings-need-two" style={[styles.text, { color: colors.muted }]}>{t("together.siblings.needTwo")}</Text>;
  }
  const running = startedAt !== null;
  const zone = Math.min(3, Math.floor(elapsed / (target / 4)));
  const remaining = target - elapsed;
  return (
    <View style={styles.stack}>
      <Text style={[styles.text, { color: colors.muted }]}>{t("together.siblings.text")}</Text>
      <View accessibilityRole="list" style={styles.chips}>
        {profiles.map((profile) => {
          const selected = chosen.includes(profile.id);
          return (
            <Pressable
              key={profile.id}
              testID={`siblings-${profile.id}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected, disabled: running }}
              aria-checked={selected}
              disabled={running}
              onPress={() => setChosen((current) => (selected ? current.filter((id) => id !== profile.id) : [...current, profile.id]))}
              style={[styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface }]}
            >
              <Text style={[styles.label, { color: colors.foreground }]}>{selected ? "✅ " : ""}{profile.name}</Text>
            </Pressable>
          );
        })}
      </View>
      {running ? (
        <View testID="siblings-timer" style={[styles.timer, { borderColor: colors.border }]}>
          <Text accessible={false} style={styles.zone}>{ZONES[zone]}</Text>
          <Text accessibilityLiveRegion="polite" style={[styles.clock, { color: colors.foreground }]}>
            {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}
          </Text>
          <VillageButton testID="siblings-stop" secondary label={t("together.siblings.stop")} onPress={() => { setStartedAt(null); setElapsed(0); }} />
        </View>
      ) : (
        <VillageButton
          testID="siblings-start"
          icon="group"
          label={t("together.siblings.start")}
          disabled={chosen.length < 2 || brush.isActive || brush.demoMode}
          onPress={() => {
            setMessage(null);
            setElapsed(0);
            setStartedAt(Date.now());
          }}
        />
      )}
      {message ? <Text testID="siblings-message" accessibilityLiveRegion="polite" style={[styles.text, { color: colors.foreground }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  text: { fontSize: 14, lineHeight: 21 },
  label: { fontSize: 15, lineHeight: 21, fontWeight: "800" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { minHeight: 44, borderWidth: 1.5, borderRadius: 99, paddingHorizontal: 14, justifyContent: "center" },
  timer: { borderWidth: 1, borderRadius: 22, padding: 18, alignItems: "center", gap: 8 },
  zone: { fontSize: 56, lineHeight: 66 },
  clock: { fontSize: 40, lineHeight: 48, fontWeight: "900" },
});
