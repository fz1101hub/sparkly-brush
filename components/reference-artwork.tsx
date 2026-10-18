import { Image, View } from "react-native";
import { DESIGN_SHEETS, type ArtworkRegion } from "@/lib/approved-design";

// Declarative clipping preserves the original approved pixels, without redrawing the art.
export function ReferenceArtwork({
  region,
  width,
  height,
  fit = "cover",
  anchorY = 0.5,
}: {
  region: ArtworkRegion;
  width: number;
  height: number;
  fit?: "cover" | "contain";
  anchorY?: number;
}) {
  const sheet = DESIGN_SHEETS[region.sheet];
  const [x, y, sourceWidth, sourceHeight] = region.rect;
  const scale = (fit === "contain" ? Math.min : Math.max)(
    width / sourceWidth,
    height / sourceHeight,
  );
  const renderedWidth = sourceWidth * scale;
  const renderedHeight = sourceHeight * scale;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={{ width, height, overflow: "hidden" }}
    >
      <View
        style={{
          position: "absolute",
          left: (width - renderedWidth) / 2,
          top: (height - renderedHeight) * anchorY,
          width: renderedWidth,
          height: renderedHeight,
          overflow: "hidden",
        }}
      >
        <Image
          accessible={false}
          source={sheet.source}
          resizeMode="stretch"
          style={{
            position: "absolute",
            left: -x * scale,
            top: -y * scale,
            width: sheet.width * scale,
            height: sheet.height * scale,
          }}
        />
      </View>
    </View>
  );
}
