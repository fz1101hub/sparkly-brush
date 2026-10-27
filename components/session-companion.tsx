import { useEffect, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useBrush } from "@/contexts/brush-context";
import { useOptionalCreatureName, useOptionalExtras } from "@/contexts/extras-context";
import { useBrushling } from "@/contexts/brushling-context";
import { useI18n } from "@/contexts/locale-context";
import { EPISODES, nextEpisode } from "@/lib/learning/serial-story";
import { stainsLeft, storyPartCue, voiceCue, ZONES } from "@/lib/session-companions";
import { speak } from "@/lib/speech";

/**
 * Company during the two minutes (lotto 6): the creature's voice with the child's name (voce 8)
 * or, when chosen, a part of the serial story at each zone (voce 7), and the stains in the mouth.
 * An episode counts as heard only if the session is completed, so a missed one comes back.
 */
/**
 * The voice and the story, mounted once at the root (not on the session screen, which closes with
 * the session): it must still be there when the session ends to mark the episode as heard.
 */
export function SessionNarrator() {
  const { t, locale } = useI18n();
  const brush = useBrush();
  const record = useOptionalExtras();
  const { selected } = useBrushling();
  const creatureName = useOptionalCreatureName(selected.id) ?? selected.name;
  const extras = record?.extras;
  const previous = useRef(0);
  const episode = useRef<number | null>(null);
  const last = useRef({ elapsed: 0, target: 120 });
  const story = extras?.serialStory === true;
  const voice = extras?.creatureVoice === true;
  const apply = record?.apply;

  useEffect(() => {
    if (!brush.isActive) return;
    const elapsed = brush.activeElapsed;
    const target = brush.activeTarget;
    const before = previous.current;
    previous.current = elapsed;
    last.current = { elapsed, target };
    if (story && extras) {
      const part = storyPartCue(before, elapsed, target);
      if (part !== null) {
        if (part === 0 || episode.current === null) episode.current = nextEpisode(extras.serialHeard);
        const text = EPISODES[episode.current][locale];
        speak(part === 0 ? `${text.title}. ${text.parts[0]}` : text.parts[part], locale);
      }
      return;
    }
    if (voice) {
      const cue = voiceCue(before, elapsed, target);
      if (cue) speak(t(cue, { name: creatureName, seconds: Math.round(target / ZONES) }), locale);
    }
  }, [brush.activeElapsed, brush.activeTarget, brush.isActive, creatureName, extras, locale, story, t, voice]);

  // The session is over: the episode counts only if the two minutes were done.
  useEffect(() => {
    if (brush.isActive) return;
    const played = episode.current;
    const { elapsed, target } = last.current;
    previous.current = 0;
    episode.current = null;
    if (played === null || !apply || elapsed < target - 1) return;
    void apply((current) => ({ ...current, serialHeard: [...new Set([...current.serialHeard, played])].sort((a, b) => a - b) }));
  }, [apply, brush.isActive]);

  return null;
}

/** The creature's mouth with the stains that melt zone by zone (voce 6), on the session screen. */
export function SessionCompanion({ ink }: { ink: string }) {
  const { t } = useI18n();
  const brush = useBrush();
  const { selected } = useBrushling();
  const creatureName = useOptionalCreatureName(selected.id) ?? selected.name;
  if (!brush.isActive) return null;
  const stains = stainsLeft(brush.activeElapsed, brush.activeTarget);
  const total = stains.reduce((sum, count) => sum + count, 0);
  return (
    <View
      testID="session-stains"
      accessible
      accessibilityLabel={t("stains.label", { name: creatureName, count: total })}
      style={styles.mouth}
    >
      {stains.map((count, zone) => (
        <View key={zone} testID={`stains-zone-${zone}`} style={[styles.zone, { borderColor: ink }, zone === brush.activeZone && styles.activeZone]}>
          <Text accessible={false} style={styles.emoji}>{count ? "🦠".repeat(count) : "✨"}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mouth: { flexDirection: "row", flexWrap: "wrap", width: 220, alignSelf: "center", gap: 6, justifyContent: "center" },
  zone: { width: 104, minHeight: 36, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  activeZone: { borderWidth: 2.5 },
  emoji: { fontSize: 16, lineHeight: 22 },
});
