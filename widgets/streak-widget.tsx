import { FlexWidget, TextWidget } from "react-native-android-widget";

/**
 * Home-screen widget on Android (voce 42): the child's streak and the next brushing. A tap opens
 * sparklybrush://start, which starts the guided timer. iOS needs a WidgetKit extension.
 */
export type WidgetSummary = { name: string; streak: number; next: string; title: string; streakLabel: string; tap: string };

export const EMPTY_WIDGET: WidgetSummary = { name: "", streak: 0, next: "", title: "Sparkly Brush", streakLabel: "", tap: "" };

export function StreakWidget({ summary }: { summary: WidgetSummary }) {
  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: "sparklybrush://start" }}
      style={{
        height: "match_parent",
        width: "match_parent",
        backgroundColor: "#FFF4C9",
        borderRadius: 24,
        padding: 14,
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <TextWidget text={summary.name ? `${summary.title} · ${summary.name}` : summary.title} style={{ fontSize: 14, color: "#56617D", fontWeight: "700" }} />
      <TextWidget text={`🔥 ${summary.streak} ${summary.streakLabel}`} style={{ fontSize: 26, color: "#17213A", fontWeight: "900" }} />
      <TextWidget text={summary.next} style={{ fontSize: 14, color: "#17213A" }} />
      <TextWidget text={summary.tap} style={{ fontSize: 12, color: "#2457D6", fontWeight: "700" }} />
    </FlexWidget>
  );
}
