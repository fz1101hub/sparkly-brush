import { Pressable, StyleSheet, View } from "react-native";

import { DesignText as Text } from "@/components/design-text";
import { useBrushling } from "@/contexts/brushling-context";
import { useExtras } from "@/contexts/extras-context";
import { useI18n } from "@/contexts/locale-context";
import { useColors } from "@/hooks/use-colors";
import { useCurrentDayTimestamp } from "@/hooks/use-current-day";
import { ALL_STICKERS, albumView, COMMON_PAGES, type AlbumPage } from "@/lib/album";
import type { TranslationKey } from "@/lib/i18n";
import { speak } from "@/lib/speech";
import { seasonAt, seasonEnd } from "@/lib/seasons";

const PAGES: AlbumPage[] = [...COMMON_PAGES, "rare", "seasons", "friends", "boss"];

/** The sticker album (voci 14, 15, 12 e 13), page by page; a tap reads the sticker's name. */
export function StickerAlbum() {
  const colors = useColors();
  const { t, formatDate, locale } = useI18n();
  const { stats } = useBrushling();
  const { extras } = useExtras();
  const today = useCurrentDayTimestamp();
  const view = albumView(stats.completedSessions, extras.album, extras.bossWins.length);
  const little = extras.ageGroup === "under3" || extras.ageGroup === "3to6";
  const season = seasonAt(today);
  return (
    <View testID="sticker-album" style={styles.stack}>
      <Text style={[styles.text, { color: colors.muted }]}>{t("album.intro")}</Text>
      <Text testID="album-count" style={[styles.count, { color: colors.foreground }]}>
        {t("album.count", { owned: view.ownedCount, total: view.total })}
      </Text>
      {view.doubles > 0 ? <Text style={[styles.text, { color: colors.muted }]}>{t("album.doubles", { count: view.doubles })}</Text> : null}
      {season ? (
        <Text testID="album-season" style={[styles.text, { color: colors.foreground }]}>
          {t("season.banner", { season: t(`season.${season}`), date: formatDate(seasonEnd(season, today), { day: "numeric", month: "long" }) })}
        </Text>
      ) : null}
      {view.nextEgg ? (
        <Text testID="album-egg" style={[styles.text, { color: colors.foreground }]}>
          {t(view.nextEgg.found ? "album.egg.warming" : "album.egg.waiting", {
            count: view.nextEgg.found ? view.nextEgg.sessionsLeft : view.nextEgg.sessionsLeft - 5,
          })}
        </Text>
      ) : null}
      {PAGES.map((page) => (
        <View key={page} testID={`album-page-${page}`} style={[styles.page, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text accessibilityRole="header" style={[styles.pageTitle, { color: colors.foreground }]}>{t(`album.page.${page}`)}</Text>
          <View style={styles.grid}>
            {ALL_STICKERS.filter((sticker) => sticker.page === page).map((sticker) => {
              const owned = view.owned.has(sticker.id);
              const name = t(`album.sticker.${sticker.id}` as TranslationKey);
              return (
                <Pressable
                  key={sticker.id}
                  testID={`sticker-${sticker.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={owned ? name : t("album.missing")}
                  accessibilityState={{ selected: owned }}
                  onPress={() => speak(owned ? name : t("album.missing"), locale)}
                  style={[styles.sticker, little && styles.stickerLittle, { borderColor: owned ? "#E8BE38" : colors.border, backgroundColor: owned ? "#FFF8E1" : colors.background }]}
                >
                  <Text accessible={false} style={[styles.emoji, little && styles.emojiLittle, !owned && styles.hidden]}>{owned ? sticker.emoji : "?"}</Text>
                  {owned && !little ? <Text accessible={false} numberOfLines={2} style={styles.name}>{name}</Text> : null}
                </Pressable>
              );
            })}
          </View>
          {page === "boss" && view.bossWins > 0 ? (
            <Text style={[styles.text, { color: colors.muted }]}>{t("album.bossWins", { count: view.bossWins })}</Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: 12 },
  text: { fontSize: 14, lineHeight: 21 },
  count: { fontSize: 18, lineHeight: 24, fontWeight: "900" },
  page: { borderWidth: 1, borderRadius: 22, padding: 14, gap: 10 },
  pageTitle: { fontSize: 17, lineHeight: 23, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  sticker: { width: 92, minHeight: 92, borderRadius: 16, borderWidth: 1.5, alignItems: "center", justifyContent: "center", padding: 6, gap: 2 },
  stickerLittle: { width: 104, minHeight: 104 },
  emoji: { fontSize: 32, lineHeight: 40 },
  emojiLittle: { fontSize: 46, lineHeight: 56 },
  hidden: { color: "#56617D", fontWeight: "900" },
  name: { color: "#17213A", fontSize: 11, lineHeight: 14, textAlign: "center", fontWeight: "700" },
});
