import { registerWidgetTaskHandler } from "react-native-android-widget";

import { widgetTaskHandler } from "./widget-task-handler";

// The widget draws itself in a headless task, also when the app is closed.
registerWidgetTaskHandler(widgetTaskHandler);
