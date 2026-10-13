import { AccessibilityInfo, Platform } from "react-native";

let liveRegion: HTMLElement | null = null;

function webLiveRegion(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  if (!liveRegion) {
    liveRegion = document.createElement("div");
    liveRegion.setAttribute("role", "status");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    Object.assign(liveRegion.style, {
      position: "absolute",
      width: "1px",
      height: "1px",
      overflow: "hidden",
      clip: "rect(0 0 0 0)",
      whiteSpace: "nowrap",
    });
    document.body.appendChild(liveRegion);
  }
  return liveRegion;
}

/**
 * Speaks a message through VoiceOver or TalkBack. react-native-web leaves
 * `announceForAccessibility` empty, so the web uses a hidden polite live region.
 */
export function announce(message: string): void {
  if (!message) return;
  if (Platform.OS === "web") {
    const region = webLiveRegion();
    if (!region) return;
    region.textContent = "";
    region.textContent = message;
    return;
  }
  try {
    AccessibilityInfo.announceForAccessibility(message);
  } catch {
    // Announcements are best effort: a failure must never break the flow.
  }
}
