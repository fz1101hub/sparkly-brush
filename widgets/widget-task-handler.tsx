import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";

import { EMPTY_WIDGET, StreakWidget, type WidgetSummary } from "./streak-widget";

export const WIDGET_SUMMARY_KEY = "brushlings.widget.v1";

async function loadSummary(): Promise<WidgetSummary> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_SUMMARY_KEY);
    return raw ? { ...EMPTY_WIDGET, ...(JSON.parse(raw) as Partial<WidgetSummary>) } : EMPTY_WIDGET;
  } catch {
    return EMPTY_WIDGET;
  }
}

/** Runs headless when Android asks the widget to draw: it shows the last summary the app saved. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps): Promise<void> {
  switch (props.widgetAction) {
    case "WIDGET_ADDED":
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED":
      props.renderWidget(<StreakWidget summary={await loadSummary()} />);
      break;
    default:
      break;
  }
}
