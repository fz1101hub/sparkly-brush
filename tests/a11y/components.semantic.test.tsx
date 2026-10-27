import React, { act, type ReactNode } from "react";
import { createRoot, type TestInstance } from "test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  chooseStarter: vi.fn(),
}));

vi.mock("react-native", async () => {
  const ReactModule = await import("react");
  const host = (type: string) => function Host(props: Record<string, unknown> & { children?: ReactNode }) {
    const children = typeof props.children === "function"
      ? (props.children as (state: { pressed: boolean }) => ReactNode)({ pressed: false })
      : props.children;
    const { children: _children, ...rest } = props;
    return ReactModule.createElement(type, rest, children);
  };
  return {
    View: host("View"),
    Text: host("Text"),
    Pressable: host("Pressable"),
    Platform: {
      OS: "web",
      select: (styles: { web?: unknown; default?: unknown }) => styles.web ?? styles.default,
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
    default: (props: Record<string, unknown> & { children?: ReactNode }) => ReactModule.createElement("Svg", props, props.children),
    Circle: (props: Record<string, unknown>) => ReactModule.createElement("Circle", props),
    Defs: (props: Record<string, unknown> & { children?: ReactNode }) => ReactModule.createElement("Defs", props, props.children),
    LinearGradient: (props: Record<string, unknown> & { children?: ReactNode }) =>
      ReactModule.createElement("LinearGradient", props, props.children),
    Stop: (props: Record<string, unknown>) => ReactModule.createElement("Stop", props),
    Path: (props: Record<string, unknown>) => ReactModule.createElement("Path", props),
  };
});
vi.mock("@expo/vector-icons/MaterialIcons", async () => {
  const ReactModule = await import("react");
  return {
    default: (props: Record<string, unknown>) => ReactModule.createElement("Icon", props),
  };
});
vi.mock("@/components/brushling-avatar", async () => {
  const ReactModule = await import("react");
  return {
    BrushlingAvatar: (props: Record<string, unknown>) => ReactModule.createElement("BrushlingAvatar", props),
  };
});
vi.mock("@/components/reference-artwork", async () => {
  const ReactModule = await import("react");
  return {
    ReferenceArtwork: (props: Record<string, unknown>) => ReactModule.createElement("ReferenceArtwork", props),
  };
});
vi.mock("@/lib/theme-provider", async () => {
  const { getAppTheme } = await import("@/lib/app-themes");
  const theme = getAppTheme("adventure");
  return { useThemeContext: () => ({ theme, colors: theme.colors, colorScheme: theme.scheme, ready: true }) };
});
vi.mock("@/hooks/use-colors", () => ({
  useColors: () => ({
    foreground: "#111111",
    muted: "#666666",
    primary: "#2457D6",
    border: "#CCCCCC",
    surface: "#FFFFFF",
  }),
}));
vi.mock("@/contexts/brushling-context", () => ({
  useBrushling: () => ({ selectedId: "bloopi", chooseStarter: mocks.chooseStarter }),
}));

import { MouthZones } from "@/components/mouth-zones";
import { StarterChooser } from "@/components/starter-chooser";
import { TimerRing } from "@/components/timer-ring";
import { TestLocaleProvider } from "@/tests/helpers/test-locale-provider";

function byTestId(container: TestInstance, testID: string): TestInstance {
  const match = container.queryAll((node) => node.props.testID === testID)[0];
  if (!match) throw new Error(`Elemento ${testID} non trovato`);
  return match;
}

describe("accessibility semantic contracts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.chooseStarter.mockResolvedValue(undefined);
  });

  it("espone timer e zone con ruoli e valori numerici", async () => {
    const renderer = createRoot({ textComponentTypes: ["Text"] });
    await act(async () => {
      renderer.render(
        <TestLocaleProvider>
          <TimerRing elapsed={45} target={120} active />
          <MouthZones activeZone={2} isActive />
        </TestLocaleProvider>,
      );
    });

    const timer = byTestId(renderer.container, "manual-timer");
    expect(timer.props.accessibilityRole).toBe("progressbar");
    expect(timer.props.accessibilityLabel).toBe(
      "Timer di spazzolamento: 0:45 di 2:00",
    );
    expect(timer.props.accessibilityValue).toEqual({
      min: 0,
      now: 45,
      max: 120,
      text: "Timer di spazzolamento: 0:45 di 2:00",
    });
    expect(timer.props["aria-valuemin"]).toBe(0);
    expect(timer.props["aria-valuenow"]).toBe(45);
    expect(timer.props["aria-valuemax"]).toBe(120);
    expect(timer.props["aria-valuetext"]).toBe(
      "Timer di spazzolamento: 0:45 di 2:00",
    );

    const zones = byTestId(renderer.container, "mouth-zones-progress");
    expect(zones.props.accessibilityRole).toBe("progressbar");
    expect(zones.props.accessibilityValue).toEqual({ min: 0, now: 2, max: 4, text: "2 zone completate su 4" });
    expect(zones.props["aria-valuemin"]).toBe(0);
    expect(zones.props["aria-valuenow"]).toBe(2);
    expect(zones.props["aria-valuemax"]).toBe(4);
    expect(zones.props["aria-valuetext"]).toBe("2 zone completate su 4");
    expect(zones.props.accessibilityHint).toContain("Basso a sinistra");
    await act(async () => renderer.unmount());
  });

  it("modella gli starter come radio e mantiene una sola scelta selezionata", async () => {
    const renderer = createRoot({ textComponentTypes: ["Text"] });
    await act(async () =>
      renderer.render(
        <TestLocaleProvider>
          <StarterChooser />
        </TestLocaleProvider>,
      ),
    );

    const group = byTestId(renderer.container, "starter-chooser");
    expect(group.props.accessibilityRole).toBe("radiogroup");
    expect(group.props.accessibilityLabel).toBe("Scegli il tuo primo Brushling");

    const starterCards = renderer.container.queryAll((node) => (
      typeof node.props.testID === "string" && node.props.testID.startsWith("starter-")
        && node.props.testID !== "starter-chooser"
        && node.props.testID !== "starter-confirm"
    ));
    expect(starterCards).toHaveLength(3);
    expect(starterCards.filter((node) => node.props.accessibilityState?.checked)).toHaveLength(1);

    const second = starterCards[1];
    await act(async () => {
      (second.props.onPress as () => void)();
    });
    expect(byTestId(renderer.container, String(second.props.testID)).props.accessibilityState)
      .toEqual({ checked: true });
    expect(byTestId(renderer.container, "starter-confirm").props.accessibilityLabel)
      .toMatch(/^Conferma .+ come primo Brushling$/);
    await act(async () => renderer.unmount());
  });
});
