import React, { act, type ReactNode } from "react";
import { createRoot } from "test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TestLocaleProvider } from "@/tests/helpers/test-locale-provider";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({ parentGateEnabled: false }));

vi.mock("@/contexts/preferences-context", () => ({
  useOptionalPreferences: () => null,
  usePreferences: () => ({ preferences: { parentGateEnabled: mocks.parentGateEnabled } }),
}));
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
    Modal: host("Modal"),
    TextInput: host("TextInput"),
    StyleSheet: {
      create: (styles: unknown) => styles,
      flatten: (style: unknown): unknown =>
        Array.isArray(style) ? Object.assign({}, ...style.flat(Infinity).filter(Boolean)) : (style ?? {}),
    },
    Platform: { OS: "ios" },
  };
});

import { ParentGateProvider, useParentGate } from "@/contexts/parent-gate-context";

async function renderGate() {
  let gate!: ReturnType<typeof useParentGate>;
  function Probe() {
    gate = useParentGate();
    return null;
  }
  const renderer = createRoot();
  await act(async () => {
    renderer.render(
      <TestLocaleProvider locale="it">
        <ParentGateProvider>
          <Probe />
        </ParentGateProvider>
      </TestLocaleProvider>,
    );
  });
  const byTestId = (testID: string) => renderer.container.queryAll((node) => node.props.testID === testID);
  return { renderer, gate: () => gate, byTestId };
}

describe("ParentGateProvider", () => {
  beforeEach(() => {
    mocks.parentGateEnabled = false;
  });

  it("con il blocco spento esegue subito l'azione", async () => {
    const { renderer, gate, byTestId } = await renderGate();
    const action = vi.fn();
    act(() => gate().requireParent(action));
    expect(action).toHaveBeenCalledTimes(1);
    expect(byTestId("parent-gate-modal")).toHaveLength(0);
    await act(async () => renderer.unmount());
  });

  it("con il blocco acceso chiede la moltiplicazione, rifiuta le risposte sbagliate e poi ricorda lo sblocco", async () => {
    mocks.parentGateEnabled = true;
    const { renderer, gate, byTestId } = await renderGate();
    const action = vi.fn();
    act(() => gate().requireParent(action));
    expect(action).not.toHaveBeenCalled();
    expect(byTestId("parent-gate-modal")).toHaveLength(1);

    const answerOf = () => {
      const question = byTestId("parent-gate-question")[0].children.join("");
      const [first, second] = question.match(/\d+/g)!.map(Number);
      return first * second;
    };
    const type = (text: string) => act(() => (byTestId("parent-gate-input")[0].props.onChangeText as (t: string) => void)(text));
    const confirm = () => act(() => (byTestId("parent-gate-confirm")[0].props.onPress as () => void)());

    await type(String(answerOf() + 1));
    await confirm();
    expect(action).not.toHaveBeenCalled();
    expect(byTestId("parent-gate-wrong")).toHaveLength(1);

    await type(String(answerOf()));
    await confirm();
    expect(action).toHaveBeenCalledTimes(1);
    expect(byTestId("parent-gate-modal")).toHaveLength(0);

    const second = vi.fn();
    act(() => gate().requireParent(second));
    expect(second).toHaveBeenCalledTimes(1);
    expect(gate().isUnlocked()).toBe(true);
    await act(async () => renderer.unmount());
  });

  it("annullare chiude la domanda senza eseguire l'azione", async () => {
    mocks.parentGateEnabled = true;
    const { renderer, gate, byTestId } = await renderGate();
    const action = vi.fn();
    act(() => gate().requireParent(action));
    act(() => (byTestId("parent-gate-cancel")[0].props.onPress as () => void)());
    expect(byTestId("parent-gate-modal")).toHaveLength(0);
    expect(action).not.toHaveBeenCalled();
    await act(async () => renderer.unmount());
  });
});
