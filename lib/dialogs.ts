import { Alert, Platform } from "react-native";

type DestructiveConfirmation = {
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  onConfirm: () => void;
};

/**
 * Asks before a destructive action on every platform. react-native-web implements
 * `Alert.alert` as a no-op, so on the web the action would otherwise never run.
 */
export function confirmDestructive({
  title,
  message,
  cancelLabel,
  confirmLabel,
  onConfirm,
}: DestructiveConfirmation): void {
  if (Platform.OS === "web") {
    if (globalThis.confirm?.(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: cancelLabel, style: "cancel" },
    { text: confirmLabel, style: "destructive", onPress: onConfirm },
  ]);
}

/** Informational dialog that is also shown on the web. */
export function showMessage(title: string, message: string): void {
  if (Platform.OS === "web") {
    globalThis.alert?.(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
