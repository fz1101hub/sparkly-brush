import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";

/** A short how-to for the family, folded by default (from PR #10). */
export function QuickGuide() {
  const colors = useColors();
  const router = useRouter();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const copy = { color: colors.foreground, fontSize: 16, lineHeight: 24 };
  const link = (label: string, route: "/(tabs)/parent" | "/(tabs)/backup") => (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(route)}
      style={{ minHeight: 48, justifyContent: "center" }}
    >
      <Text style={{ ...copy, color: colors.primary, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
        borderRadius: 22,
        padding: 18,
        gap: 12,
      }}
    >
      <Pressable
        testID="quick-guide-toggle"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen((value) => !value)}
        style={{ minHeight: 48, justifyContent: "center" }}
      >
        <Text style={{ ...copy, color: colors.primary, fontWeight: "800" }}>
          {t(open ? "quickGuide.close" : "quickGuide.open")}
        </Text>
      </Pressable>
      {open ? (
        <>
          <Text style={copy}>{t("quickGuide.step1")}</Text>
          <Text style={copy}>{t("quickGuide.step2")}</Text>
          <Text style={copy}>{t("quickGuide.step3")}</Text>
          <Text style={copy}>{t("quickGuide.step4")}</Text>
          {link(t("quickGuide.rewardsLink"), "/(tabs)/parent")}
          {link(t("quickGuide.backupLink"), "/(tabs)/backup")}
        </>
      ) : null}
    </View>
  );
}
