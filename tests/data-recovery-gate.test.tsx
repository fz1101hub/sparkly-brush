import React, { act, type ReactNode } from "react";
import { createRoot } from "test-renderer";
import { describe, expect, it, vi } from "vitest";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const storage = vi.hoisted(() => ({ initializeHistoryStorage: vi.fn() }));

vi.mock("@/lib/brush-storage", () => storage);
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
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: unknown): unknown =>
        Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : (style ?? {}),
    },
  };
});

import { DataRecoveryGate } from "@/components/data-recovery-gate";
import { TestLocaleProvider } from "@/tests/helpers/test-locale-provider";

describe("DataRecoveryGate", () => {
  it("dopo un'inizializzazione fallita permette di riprovare senza riavviare l'app", async () => {
    storage.initializeHistoryStorage
      .mockRejectedValueOnce(new Error("database is locked"))
      .mockResolvedValueOnce(undefined);
    const renderer = createRoot();
    await act(async () => {
      renderer.render(
        <TestLocaleProvider>
          <DataRecoveryGate>
            {React.createElement("app-content")}
          </DataRecoveryGate>
        </TestLocaleProvider>,
      );
    });

    const byTestId = (testID: string) =>
      renderer.container.queryAll((node) => node.props.testID === testID);
    expect(byTestId("data-recovery-failed")).toHaveLength(1);
    expect(renderer.container.queryAll((node) => node.type === "app-content")).toHaveLength(0);
    const retry = byTestId("data-recovery-retry")[0];
    expect(retry.queryAll((node) => node.type === "Text")[0].children).toEqual(["Riprova"]);

    await act(async () => {
      (retry.props.onPress as () => void)();
    });

    expect(storage.initializeHistoryStorage).toHaveBeenCalledTimes(2);
    expect(byTestId("data-recovery-failed")).toHaveLength(0);
    expect(renderer.container.queryAll((node) => node.type === "app-content")).toHaveLength(1);
    await act(async () => renderer.unmount());
  });
});
