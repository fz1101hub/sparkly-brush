import React, { act, type ReactNode } from "react";
import { createRoot, type TestInstance } from "test-renderer";
import { describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("react-native", async () => {
  const ReactModule = await import("react");
  const host = (type: string) =>
    function Host(props: Record<string, unknown> & { children?: ReactNode }) {
      const children =
        typeof props.children === "function"
          ? (props.children as (state: { pressed: boolean }) => ReactNode)({ pressed: false })
          : props.children;
      const { children: _children, ...rest } = props;
      return ReactModule.createElement(type, rest, children);
    };
  return {
    View: host("View"),
    Text: host("Text"),
    Pressable: host("Pressable"),
    StyleSheet: { create: (styles: unknown) => styles },
  };
});
vi.mock("@expo/vector-icons/MaterialIcons", async () => {
  const ReactModule = await import("react");
  return {
    default: (props: Record<string, unknown>) => ReactModule.createElement("Icon", props),
  };
});

import { DemoModeNotice } from "@/components/demo-mode-notice";
import { TestLocaleProvider } from "@/tests/helpers/test-locale-provider";

function relativeLuminance(hex: string): number {
  const [red, green, blue] = [1, 3, 5].map((index) => {
    const channel = Number.parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

function flatStyle(node: TestInstance): Record<string, unknown> {
  const style = typeof node.props.style === "function"
    ? node.props.style({ pressed: false })
    : node.props.style;
  return Object.assign({}, ...[style].flat(Infinity).filter(Boolean)) as Record<string, unknown>;
}

/** Nearest ancestor (or self) with an explicit background color. */
function backgroundOf(node: TestInstance): string {
  let current: TestInstance | null = node;
  while (current) {
    const background = flatStyle(current).backgroundColor;
    if (typeof background === "string") return background;
    current = current.parent;
  }
  throw new Error("Nessuno sfondo esplicito: il contrasto dipenderebbe dal tema");
}

describe("DemoModeNotice", () => {
  it("mantiene testo leggibile (≥ 4,5:1) su sfondi propri, indipendenti dal tema", async () => {
    const onExit = vi.fn();
    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <TestLocaleProvider>
          <DemoModeNotice onExit={onExit} />
        </TestLocaleProvider>,
      );
    });

    const texts = renderer.container.queryAll((node) => node.type === "Text");
    expect(texts.map((node) => node.children.join(""))).toEqual([
      "LABORATORIO DEMO",
      "Dati simulati attivi",
      "Storico reale e backup restano separati e intatti.",
      "Esci",
    ]);
    for (const text of texts) {
      const color = flatStyle(text).color;
      expect(typeof color).toBe("string");
      expect(contrastRatio(color as string, backgroundOf(text))).toBeGreaterThanOrEqual(4.5);
    }

    const exit = renderer.container.queryAll((node) => node.type === "Pressable")[0];
    expect(exit.props.accessibilityLabel).toBe("Esci dalla modalità demo");
    await act(async () => {
      (exit.props.onPress as () => void)();
    });
    expect(onExit).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });
});
