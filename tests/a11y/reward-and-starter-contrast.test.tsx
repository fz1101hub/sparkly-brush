import React, { act, type ReactNode } from "react";
import { createRoot, type TestInstance } from "test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { getBrushling } from "@/lib/brushlings";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  chooseStarter: vi.fn(),
  dismissReward: vi.fn(),
  selectedId: "spriggo",
  reward: {
    sessionId: "session-1",
    completed: false,
    xpEarned: 20,
    coinsEarned: 4,
    previousLevel: 1,
    level: 1,
  } as Record<string, unknown> | null,
}));

vi.mock("react-native", async () => {
  const ReactModule = await import("react");
  const host = (type: string) =>
    function Host(props: Record<string, unknown> & { children?: ReactNode }) {
      const children =
        typeof props.children === "function"
          ? (props.children as (state: { pressed: boolean }) => ReactNode)({
              pressed: false,
            })
          : props.children;
      const { children: _children, ...rest } = props;
      return ReactModule.createElement(type, rest, children);
    };
  return {
    Modal: host("Modal"),
    ScrollView: host("ScrollView"),
    View: host("View"),
    Text: host("Text"),
    Pressable: host("Pressable"),
    Platform: {
      OS: "web",
      select: (styles: { web?: unknown; default?: unknown }) =>
        styles.web ?? styles.default,
    },
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: unknown): unknown =>
        Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : (style ?? {}),
    },
  };
});
vi.mock("react-native-svg", async () => {
  const ReactModule = await import("react");
  return {
    default: (props: Record<string, unknown> & { children?: ReactNode }) =>
      ReactModule.createElement("Svg", props, props.children),
    Circle: (props: Record<string, unknown>) =>
      ReactModule.createElement("Circle", props),
    Ellipse: (props: Record<string, unknown>) =>
      ReactModule.createElement("Ellipse", props),
    G: (props: Record<string, unknown> & { children?: ReactNode }) =>
      ReactModule.createElement("G", props, props.children),
    Path: (props: Record<string, unknown>) =>
      ReactModule.createElement("Path", props),
  };
});
vi.mock("@expo/vector-icons/MaterialIcons", async () => {
  const ReactModule = await import("react");
  return {
    default: (props: Record<string, unknown>) =>
      ReactModule.createElement("Icon", props),
  };
});
vi.mock("expo-haptics", () => ({
  NotificationFeedbackType: { Success: "success", Warning: "warning" },
  notificationAsync: vi.fn(),
}));
vi.mock("@/components/brushling-avatar", async () => {
  const ReactModule = await import("react");
  return {
    BrushlingAvatar: (props: Record<string, unknown>) =>
      ReactModule.createElement("BrushlingAvatar", props),
  };
});
vi.mock("@/components/celebration-burst", async () => {
  const ReactModule = await import("react");
  return {
    CelebrationBurst: (props: Record<string, unknown>) =>
      ReactModule.createElement("CelebrationBurst", props),
  };
});
vi.mock("@/contexts/audio-feedback-context", () => ({
  useAudioFeedback: () => ({ playSuccess: vi.fn() }),
}));
vi.mock("@/contexts/preferences-context", () => ({
  usePreferences: () => ({ preferences: { hapticsEnabled: false } }),
}));
vi.mock("@/hooks/use-colors", () => ({
  useColors: () => ({
    foreground: "#17213A",
    muted: "#56617D",
    primary: "#2457D6",
    border: "#CCCCCC",
    surface: "#FFFFFF",
  }),
}));
vi.mock("@/contexts/brushling-context", async () => {
  const { getBrushling } = await import("@/lib/brushlings");
  return {
    useBrushling: () => {
      const selected = getBrushling(
        mocks.selectedId as Parameters<typeof getBrushling>[0],
      );
      return {
        selectedId: mocks.selectedId,
        selected,
        reward: mocks.reward,
        discovery: null,
        progressReward: null,
        chooseStarter: mocks.chooseStarter,
        dismissReward: mocks.dismissReward,
      };
    },
  };
});

import { SessionRewardModal } from "@/components/session-reward-modal";
import { StarterChooser } from "@/components/starter-chooser";
import { TestLocaleProvider } from "@/tests/helpers/test-locale-provider";

function byTestId(container: TestInstance, testID: string): TestInstance {
  const match = container.queryAll((node) => node.props.testID === testID)[0];
  if (!match) throw new Error(`Elemento ${testID} non trovato`);
  return match;
}

function resolvedStyle(node: TestInstance): unknown {
  const style = node.props.style;
  return typeof style === "function" ? style({ pressed: false }) : style;
}

function colorFromStyle(
  style: unknown,
  property: "color" | "backgroundColor",
): string | undefined {
  // DesignText nests the caller's style inside its own array.
  const entries = Array.isArray(style) ? style.flat(Infinity) : [style];
  for (const entry of [...entries].reverse()) {
    if (entry && typeof entry === "object" && property in entry) {
      return (entry as Record<string, string>)[property];
    }
  }
  return undefined;
}

function contrastRatio(foreground: string, background: string): number {
  const rgb = (color: string) =>
    color
      .match(/[\da-f]{2}/gi)
      ?.map((part) => Number.parseInt(part, 16) / 255) ?? [];
  const luminance = (color: string) => {
    const [red, green, blue] = rgb(color).map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  };
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

describe("starter and session reward contrast contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectedId = "spriggo";
    mocks.reward = {
      sessionId: "session-1",
      completed: false,
      xpEarned: 20,
      coinsEarned: 4,
      previousLevel: 1,
      level: 1,
    };
  });

  it("uses AA text accents when Spriggo or Flarello is selected as starter", async () => {
    const renderer = createRoot({ textComponentTypes: ["Text"] });
    await act(async () => {
      renderer.render(
        <TestLocaleProvider>
          <StarterChooser />
        </TestLocaleProvider>,
      );
    });

    for (const id of ["spriggo", "flarello"] as const) {
      await act(async () => {
        (
          byTestId(renderer.container, `starter-${id}`).props
            .onPress as () => void
        )();
      });

      const creature = getBrushling(id);
      const selectedCard = byTestId(renderer.container, `starter-${id}`);
      const elementLabel = selectedCard.queryAll(
        (node) =>
          node.type === "Text" && node.props.children === creature.element,
      )[0];
      const confirm = byTestId(renderer.container, "starter-confirm");
      const confirmBackground = colorFromStyle(
        resolvedStyle(confirm),
        "backgroundColor",
      );

      expect(selectedCard.props.accessibilityState).toEqual({ checked: true });
      expect(colorFromStyle(elementLabel.props.style, "color")).toBe(
        creature.textAccent,
      );
      expect(confirmBackground).toBe(creature.textAccent);
      expect(
        contrastRatio(creature.textAccent, "#FFFFFF"),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio("#FFFFFF", confirmBackground!),
      ).toBeGreaterThanOrEqual(4.5);
    }

    await act(async () => renderer.unmount());
  });

  it("uses AA actions for non-celebration rewards across non-Bloopi companions", async () => {
    const renderer = createRoot({ textComponentTypes: ["Text"] });

    for (const id of ["spriggo", "flarello", "voltuff"] as const) {
      mocks.selectedId = id;
      await act(async () => {
        renderer.render(
          <TestLocaleProvider>
            <SessionRewardModal />
          </TestLocaleProvider>,
        );
      });

      const creature = getBrushling(id);
      const modal = byTestId(renderer.container, "session-reward-modal");
      const dismiss = byTestId(renderer.container, "session-reward-dismiss");
      const buttonBackground = colorFromStyle(
        resolvedStyle(dismiss),
        "backgroundColor",
      );

      expect(modal.props.role).toBe("dialog");
      expect(modal.type).toBe("ScrollView");
      expect(modal.props.contentContainerStyle).toMatchObject({ flexGrow: 1 });
      expect(buttonBackground).toBe(creature.textAccent);
      expect(
        contrastRatio("#FFFFFF", buttonBackground!),
      ).toBeGreaterThanOrEqual(4.5);
    }

    await act(async () => renderer.unmount());
  });

  it("uses an AA blue action for the celebration reward modal", async () => {
    mocks.selectedId = "flarello";
    mocks.reward = {
      sessionId: "session-2",
      completed: true,
      xpEarned: 60,
      coinsEarned: 14,
      previousLevel: 2,
      level: 3,
      evolvedFrom: "Flarello",
      evolvedTo: "Fiammor",
    };
    const renderer = createRoot({ textComponentTypes: ["Text"] });
    await act(async () => {
      renderer.render(
        <TestLocaleProvider>
          <SessionRewardModal />
        </TestLocaleProvider>,
      );
    });

    const dismiss = byTestId(renderer.container, "session-reward-dismiss");
    const buttonBackground = colorFromStyle(
      resolvedStyle(dismiss),
      "backgroundColor",
    );
    const buttonText = dismiss.queryAll((node) => node.type === "Text")[0];

    expect(buttonBackground).toBe("#006ABF");
    expect(colorFromStyle(buttonText.props.style, "color")).toBe("#FFFFFF");
    expect(contrastRatio("#FFFFFF", buttonBackground!)).toBeGreaterThanOrEqual(
      4.5,
    );

    await act(async () => renderer.unmount());
  });
});
