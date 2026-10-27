import { Alert, Platform } from "react-native";

type Confirmation = {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
};

function confirm(
  { title, message, cancelLabel, confirmLabel, onConfirm }: Confirmation,
  style: "default" | "destructive",
): void {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: "cancel" },
    { text: confirmLabel, style, onPress: onConfirm },
  ]);
}

/**
 * Asks before a destructive action on every platform. react-native-web implements
 * `Alert.alert` as a no-op, so on the web the action would otherwise never run.
 */
export function confirmDestructive(confirmation: Confirmation): void {
  confirm(confirmation, "destructive");
}

/** Asks before an action that changes a setting but destroys nothing. */
export function confirmAction(confirmation: Confirmation): void {
  confirm(confirmation, "default");
}

/** Informational dialog that is also shown on the web. */
export function showMessage(title: string, message: string): void {
  if (Platform.OS === "web") {
    globalThis.alert?.(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
