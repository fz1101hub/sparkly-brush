import { useEffect, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

import { BrushlingAvatar } from "@/components/brushling-avatar";
import { useBrushling } from "@/contexts/brushling-context";
import { useCreatureName } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { getEvolution } from "@/lib/brushlings";
import type { TranslationKey } from "@/lib/i18n";

const SECONDS = 30;
const LINES: readonly TranslationKey[] = ["goodnight.line1", "goodnight.line2", "goodnight.line3", "goodnight.line4"];
// Fixed warm night colours: the same in every theme, dark and quiet before sleep.
const NIGHT = "#1E1B2E";
const MOON = "#FFE3A3";
const SOFT = "#D8CFF2";

/**
 * «Buonanotte di 30 secondi» (voce 22): after the evening brushing the creature says good night
 * on a dark, warm screen that closes by itself; then the phone may lock as usual.
 */
export function GoodnightOverlay({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { selected, stats } = useBrushling();
  const evolution = getEvolution(selected, stats.level);
  const name = useCreatureName(selected.id, evolution.name);
  const [left, setLeft] = useState(SECONDS);
  const [line] = useState(() => LINES[new Date().getDate() % LINES.length]);

  useEffect(() => {
    const timer = setInterval(() => setLeft((value) => Math.max(0, value - 1)), 1_000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (left === 0) onClose();
  }, [left, onClose]);

  return (
    <Modal animationType="fade" transparent={false} visible onRequestClose={onClose} statusBarTranslucent>
      <View testID="goodnight-overlay" style={styles.screen} accessibilityViewIsModal>
        <Text accessible={false} importantForAccessibility="no" style={styles.moon}>
          🌙
        </Text>
        <View style={styles.creature}>
          <BrushlingAvatar creature={selected} level={stats.level} size={150} framed={false} />
          <Text accessible={false} importantForAccessibility="no" style={styles.zzz}>
            💤
          </Text>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {t("goodnight.title", { name })}
        </Text>
        <Text style={styles.line}>{t(line)}</Text>
        <Text accessibilityLiveRegion="polite" style={styles.count}>
          {t("goodnight.closing", { seconds: left })}
        </Text>
        <Pressable
          testID="goodnight-close"
          accessibilityRole="button"
          onPress={onClose}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.8 }]}
        >
          <Text style={styles.buttonText}>{t("goodnight.close")}</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: NIGHT, alignItems: "center", justifyContent: "center", padding: 28, gap: 14 },
  moon: { fontSize: 44, lineHeight: 52 },
  creature: { alignItems: "center", justifyContent: "center" },
  zzz: { position: "absolute", right: -6, top: 4, fontSize: 30, lineHeight: 36 },
  title: { color: MOON, fontSize: 26, lineHeight: 34, fontWeight: "900", textAlign: "center" },
  line: { color: SOFT, fontSize: 18, lineHeight: 27, textAlign: "center", maxWidth: 340 },
  count: { color: SOFT, fontSize: 14, lineHeight: 20 },
  button: { minHeight: 48, borderRadius: 16, borderWidth: 1, borderColor: SOFT, paddingHorizontal: 20, justifyContent: "center" },
  buttonText: { color: MOON, fontSize: 17, lineHeight: 24, fontWeight: "800" },
});
