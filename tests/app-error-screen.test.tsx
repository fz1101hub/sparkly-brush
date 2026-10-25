import React, { act, type ReactNode } from "react";
import { createRoot } from "test-renderer";
import { describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock("expo-localization", () => ({ getLocales: () => [{ languageCode: "de", languageTag: "de-DE" }] }));
vi.mock("@expo/vector-icons/MaterialIcons", () => ({ default: () => null }));
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
    ScrollView: host("ScrollView"),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: unknown): unknown =>
        Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : (style ?? {}),
    },
  };
});

import { AppErrorScreen } from "@/components/app-error-screen";

describe("AppErrorScreen", () => {
  it("parla la lingua del dispositivo senza provider e riprova su richiesta", async () => {
    const retry = vi.fn(async () => undefined);
    const renderer = createRoot();
    await act(async () => {
      renderer.render(<AppErrorScreen error={new Error("boom")} retry={retry} />);
    });
    const byTestId = (testID: string) =>
      renderer.container.queryAll((node) => node.props.testID === testID);
    const texts = renderer.container.queryAll((node) => node.type === "Text").map((node) => node.children.join(""));
    expect(texts).toContain("Etwas ist schiefgelaufen");
    expect(byTestId("app-error-details")[0].children).toEqual(["boom"]);

    await act(async () => {
      (byTestId("app-error-retry")[0].props.onPress as () => void)();
    });
    expect(retry).toHaveBeenCalledTimes(1);
    await act(async () => renderer.unmount());
  });
});
