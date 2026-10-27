import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { BrushlingAvatar } from "@/components/brushling-avatar";
import { DesignText as Text } from "@/components/design-text";
import { VillageButton, VillageCard, VillageScreen, villageStyles } from "@/components/village-ui";
import { useI18n } from "@/contexts/locale-context";
import { useVillage } from "@/contexts/village-context";
import { useColors } from "@/hooks/use-colors";
import { BRUSHLINGS } from "@/lib/brushlings";
import { SPEECH_LANGUAGE } from "@/lib/learning/tooth-names";
import { STORIES, type Story } from "@/lib/learning/stories";
import { speak, stopSpeaking } from "@/lib/speech";

/** «Biblioteca delle storie»: short stories read aloud; free, also at bedtime. */
export default function LibraryScreen() {
  const colors = useColors();
  const { t, locale } = useI18n();
  const village = useVillage();
  const [story, setStory] = useState<Story | null>(null);
  const [page, setPage] = useState(0);

  const open = (next: Story) => {
    setStory(next);
    setPage(0);
  };
  const close = () => {
    stopSpeaking();
    setStory(null);
  };

  if (story) {
    const text = story.text[locale];
    const last = page === text.pages.length - 1;
    const hero = BRUSHLINGS.find((creature) => creature.id === story.hero);
    return (
      <VillageScreen testID="library-screen" eyebrow={t("village.library.title")} title={text.title}>
        <VillageCard style={styles.center}>
          {hero ? <BrushlingAvatar creature={hero} size={120} framed={false} /> : null}
          <Text style={[villageStyles.small, { color: colors.muted }]}>
            {t("library.page", { current: page + 1, total: text.pages.length })}
          </Text>
          <Text testID="library-page" style={[styles.page, { color: colors.foreground }]}>{text.pages[page]}</Text>
          <VillageButton secondary icon="volume-up" label={t("quiz.listen")} onPress={() => speak(text.pages[page], SPEECH_LANGUAGE[locale])} />
        </VillageCard>
        <View style={villageStyles.row}>
          {page > 0 ? (
            <View style={styles.action}>
              <VillageButton secondary icon="arrow-back" label={t("visit.previous")} onPress={() => setPage(page - 1)} />
            </View>
          ) : null}
          <View style={styles.action}>
            {last ? (
              <VillageButton
                testID="library-end"
                icon="check"
                label={t("library.end")}
                onPress={() => {
                  void village.apply((state) =>
                    state.storiesRead.includes(story.id) ? state : { ...state, storiesRead: [...state.storiesRead, story.id] },
                  );
                  close();
                }}
              />
            ) : (
              <VillageButton
                testID="library-next"
                icon="arrow-forward"
                label={t("quiz.next")}
                onPress={() => {
                  stopSpeaking();
                  setPage(page + 1);
                }}
              />
            )}
          </View>
        </View>
      </VillageScreen>
    );
  }

  return (
    <VillageScreen testID="library-screen" eyebrow={t("village.title")} title={t("village.library.title")}>
      <Text style={[villageStyles.body, { color: colors.foreground }]}>{t("library.intro")}</Text>
      {STORIES.map((item) => {
        const hero = BRUSHLINGS.find((creature) => creature.id === item.hero);
        const read = village.state.storiesRead.includes(item.id);
        return (
          <VillageCard key={item.id}>
            <View style={villageStyles.row}>
              {hero ? <BrushlingAvatar creature={hero} size={64} framed={false} /> : null}
              <View style={styles.copy}>
                <Text accessibilityRole="header" style={[villageStyles.title, { color: colors.foreground }]}>{item.text[locale].title}</Text>
                {read ? <Text style={[villageStyles.small, { color: colors.muted }]}>{t("library.read")}</Text> : null}
              </View>
            </View>
            <VillageButton testID={`library-open-${item.id}`} icon="menu-book" label={t("library.open")} onPress={() => open(item)} />
          </VillageCard>
        );
      })}
    </VillageScreen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center" },
  page: { fontSize: 20, lineHeight: 30, fontWeight: "700", textAlign: "center" },
  copy: { flex: 1, minWidth: 160 },
  action: { flexGrow: 1, flexBasis: 140 },
});
