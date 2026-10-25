import { Image, View } from "react-native";
import { useId } from "react";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import { DESIGN_SHEETS, type ArtworkRegion } from "@/lib/approved-design";

// Declarative clipping preserves the original approved pixels, without redrawing the art.
export function ReferenceArtwork({
  region,
  width,
  height,
  fit = "cover",
  anchorY = 0.5,
  fadeColor,
  fadeSize = 16,
}: {
  region: ArtworkRegion;
  width: number;
  height: number;
  fit?: "cover" | "contain";
  anchorY?: number;
  fadeColor?: string;
  fadeSize?: number;
}) {
  const fadeId = "reference-" + useId().replace(/[^a-zA-Z0-9]/g, "");
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
        {fadeColor ? (
          <Svg
            accessible={false}
            width={renderedWidth}
            height={renderedHeight}
            style={{ position: "absolute", left: 0, top: 0 }}
          >
            <Defs>
              <LinearGradient id={fadeId + "-x"} x1="0" y1="0" x2="1" y2="0">
                <Stop offset={0} stopColor={fadeColor} />
                <Stop
                  offset={Math.min(0.25, fadeSize / renderedWidth)}
                  stopColor={fadeColor}
                  stopOpacity={0}
                />
                <Stop
                  offset={1 - Math.min(0.25, fadeSize / renderedWidth)}
                  stopColor={fadeColor}
                  stopOpacity={0}
                />
                <Stop offset={1} stopColor={fadeColor} />
              </LinearGradient>
              <LinearGradient id={fadeId + "-y"} x1="0" y1="0" x2="0" y2="1">
                <Stop offset={0} stopColor={fadeColor} />
                <Stop
                  offset={Math.min(0.25, fadeSize / renderedHeight)}
                  stopColor={fadeColor}
                  stopOpacity={0}
                />
                <Stop
                  offset={1 - Math.min(0.25, fadeSize / renderedHeight)}
                  stopColor={fadeColor}
                  stopOpacity={0}
                />
                <Stop offset={1} stopColor={fadeColor} />
              </LinearGradient>
            </Defs>
            <Rect
              width={renderedWidth}
              height={renderedHeight}
              fill={"url(#" + fadeId + "-x)"}
            />
            <Rect
              width={renderedWidth}
              height={renderedHeight}
              fill={"url(#" + fadeId + "-y)"}
            />
          </Svg>
        ) : null}
      </View>
    </View>
  );
}
