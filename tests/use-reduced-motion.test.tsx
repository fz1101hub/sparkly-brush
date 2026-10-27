import React, { act } from "react";
import { createRoot } from "test-renderer";
import { describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const accessibility = vi.hoisted(() => ({
  enabled: false,
  listener: null as ((enabled: boolean) => void) | null,
  remove: vi.fn(),
}));

vi.mock("react-native", () => ({
  Platform: { OS: "ios" },
  AccessibilityInfo: {
    isReduceMotionEnabled: () => Promise.resolve(accessibility.enabled),
    addEventListener: (_event: string, listener: (enabled: boolean) => void) => {
      accessibility.listener = listener;
      return { remove: accessibility.remove };
    },
  },
}));

import { useReducedMotion } from "@/hooks/use-reduced-motion";

describe("useReducedMotion", () => {
  it("legge l'impostazione di sistema e segue i cambiamenti finché è montato", async () => {
    accessibility.enabled = true;
    let reduced: boolean | null = null;
    function Probe() {
      reduced = useReducedMotion();
      return null;
    }
    const renderer = createRoot();
    await act(async () => {
      renderer.render(<Probe />);
      await Promise.resolve();
    });
    expect(reduced).toBe(true);

    act(() => accessibility.listener?.(false));
    expect(reduced).toBe(false);

    await act(async () => renderer.unmount());
    expect(accessibility.remove).toHaveBeenCalled();
  });
});
