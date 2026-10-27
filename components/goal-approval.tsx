import { StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { VillageButton } from "@/components/village-ui";
import { useExtras } from "@/contexts/extras-context";
import { useOptionalFamily } from "@/contexts/family-context-value";
import { useI18n } from "@/contexts/locale-context";
import { useParentRewards } from "@/contexts/parent-rewards-context";
import { useAsyncAction } from "@/hooks/use-async-action";

/**
 * The goal the child proposed (voce 19), in the parent area: approved, it becomes a family reward
 * counted from today; declined, it disappears and the child can choose again.
 */
export function GoalApproval() {
  const { t } = useI18n();
  const runAction = useAsyncAction();
  const family = useOptionalFamily();
  const { extras, apply } = useExtras();
  const { addReward } = useParentRewards();
  const proposal = extras.goalProposal;
  if (!proposal) return null;
  const title = t(`goal.${proposal.goal}`);
  const clear = () => apply((previous) => ({ ...previous, goalProposal: null }));
  return (
    <View testID="goal-approval" style={[styles.card, { backgroundColor: "#FFF8E8", borderColor: "#F2D588" }]}>
      <Text accessibilityRole="header" style={styles.title}>{t("goal.parentTitle", { name: family?.active.name ?? "" })}</Text>
      <Text style={styles.text}>{t("goal.parentText", { goal: title, count: proposal.target })}</Text>
      <View style={styles.actions}>
        <VillageButton
          testID="goal-approve"
          label={t("goal.approve")}
          icon="check"
          onPress={() => runAction(addReward(title, "perfect-days", proposal.target).then(clear))}
        />
        <VillageButton testID="goal-decline" secondary label={t("goal.decline")} onPress={() => runAction(clear())} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 22, padding: 16, gap: 10 },
  title: { color: "#17213A", fontSize: 18, lineHeight: 24, fontWeight: "900" },
  text: { color: "#17213A", fontSize: 14, lineHeight: 21 },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
});
