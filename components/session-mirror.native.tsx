import { CameraView, useCameraPermissions } from "expo-camera";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";

import { useI18n } from "@/contexts/locale-context";

/**
 * «Specchio» (voce 76): the front camera as a mirror while brushing. It only shows the picture:
 * nothing is taken, recorded or saved, and the camera closes when the session ends (the session
 * extras unmount) or when the child closes it.
 */
export function SessionMirror({ ink }: { ink: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  const toggle = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    // Asked only now, the first time the child opens the mirror; a «no» shows why there is none.
    if (!permission?.granted) await requestPermission();
    setOpen(true);
  };

  return (
    <View style={styles.stack}>
      <Pressable
        testID="session-mirror-toggle"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => void toggle()}
        style={[styles.button, { borderColor: ink }]}
      >
        <Text style={[styles.label, { color: ink }]}>{open ? t("mirror.close") : t("mirror.open")}</Text>
      </Pressable>
      {open && permission?.granted ? (
        <View testID="session-mirror" style={[styles.frame, { borderColor: ink }]} accessible accessibilityLabel={t("mirror.label")}>
          <CameraView style={styles.camera} facing="front" mirror animateShutter={false} active={open} />
        </View>
      ) : null}
      {open && permission && !permission.granted ? (
        <View style={styles.stack}>
          <Text testID="session-mirror-denied" style={[styles.text, { color: ink }]}>{t("mirror.denied")}</Text>
          {!permission.canAskAgain ? (
            <Pressable accessibilityRole="button" onPress={() => void Linking.openSettings()} style={[styles.button, { borderColor: ink }]}>
              <Text style={[styles.label, { color: ink }]}>{t("mirror.settings")}</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { alignItems: "center", gap: 6 },
  button: { borderWidth: 1.5, borderRadius: 16, paddingHorizontal: 12, minHeight: 44, justifyContent: "center" },
  label: { fontSize: 14, lineHeight: 20, fontWeight: "800" },
  text: { fontSize: 14, lineHeight: 20, textAlign: "center", maxWidth: 280 },
  frame: { width: 220, height: 165, borderRadius: 20, borderWidth: 2, overflow: "hidden" },
  camera: { flex: 1 },
});
