import { type ReactNode, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ParentChallengeCard } from "@/components/parent-challenge-card";
import { useI18n } from "@/contexts/locale-context";
import { useParentGate } from "@/contexts/parent-gate-context";
import { useBack } from "@/hooks/use-back";

/**
 * Keeps a parent screen behind the challenge while the gate is on, also when the screen is
 * opened through a deep link. A solved challenge keeps every parent area open for a while.
 */
export function ParentGuard({ children }: { children: ReactNode }) {
  const { enabled, isUnlocked, unlock } = useParentGate();
  const { t } = useI18n();
  const goBack = useBack();
  const [solved, setSolved] = useState(false);

  if (!enabled || solved || isUnlocked()) return children;
  return (
    <View testID="parent-guard" style={styles.container}>
      <ParentChallengeCard
        cancelLabel={t("parentGate.back")}
        onCancel={goBack}
        onSolved={() => {
          unlock();
          setSolved(true);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 20, paddingVertical: 24 },
});
