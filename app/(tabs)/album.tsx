import { StickerAlbum } from "@/components/sticker-album";
import { VillageScreen } from "@/components/village-ui";
import { useI18n } from "@/contexts/locale-context";

/** Sticker album (voci 14, 15, 12 e 13): one sticker per completed session, page by page. */
export default function AlbumScreen() {
  const { t } = useI18n();
  return (
    <VillageScreen testID="album-screen" eyebrow={t("world.title")} title={t("album.title")}>
      <StickerAlbum />
    </VillageScreen>
  );
}
